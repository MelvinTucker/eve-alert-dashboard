#!/usr/bin/env node
/**
 * Ingest watcher results from the VPS into Supabase.
 *
 * Runs existing watcher commands (from the main clawd workspace):
 *  - node skills/eve-esi/eve-esi.mjs pi-check
 *  - node skills/eve-esi/eve-esi.mjs skillq-check
 *  - node skills/eve-esi/eve-esi.mjs industry-check
 *  - node skills/eve-contract-scan/eve-contract-scan.mjs scan
 *
 * Writes:
 *  - eve_account_group + eve_character (from mapping.json)
 *  - eve_check_run
 *  - eve_character_check
 *
 * Env:
 *  - SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..'); // repo root
const CLAWD_ROOT = path.resolve(ROOT, '..', '..'); // /home/clawdbot/clawd

function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function nowIso() {
  return new Date().toISOString();
}

function runJson(cmd, args) {
  const out = execFileSync(cmd, args, {
    cwd: CLAWD_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(out);
}

async function upsertMapping(sb) {
  const mappingPath = path.join(ROOT, 'mapping.json');
  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

  // 1) upsert groups
  const groupNames = Object.keys(mapping);
  for (const name of groupNames) {
    await sb.from('eve_account_group').upsert({ name, updated_at: nowIso() }, { onConflict: 'name' });
  }

  // Fetch groups for id mapping
  const { data: groups } = await sb.from('eve_account_group').select('id,name');
  const groupMap = new Map((groups || []).map((g) => [g.name, g.id]));

  // 2) upsert characters
  for (const groupName of groupNames) {
    const groupId = groupMap.get(groupName) || null;
    for (const ch of mapping[groupName]) {
      await sb.from('eve_character').upsert(
        {
          id: ch.id,
          name: ch.name,
          account_group_id: groupId,
          updated_at: nowIso(),
        },
        { onConflict: 'id' }
      );
    }
  }
}

function indexAlerts(alerts) {
  // returns Map<characterId, alert[]>
  const map = new Map();
  for (const a of alerts || []) {
    const cid = a?.character?.id;
    if (!cid) continue;
    if (!map.has(cid)) map.set(cid, []);
    map.get(cid).push(a);
  }
  return map;
}

async function insertRun(sb, check_type, meta = {}) {
  const { data, error } = await sb
    .from('eve_check_run')
    .insert({ check_type, started_at: nowIso(), finished_at: nowIso(), ok: true, meta })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function insertCharacterChecks(sb, runId, perChar, check_type) {
  // perChar: array of {character_id, status, details}
  for (const row of perChar) {
    const status = row.status;
    await sb.from('eve_character_check').insert({
      run_id: runId,
      character_id: row.character_id ?? null,
      status,
      checked_at: nowIso(),
      details: {
        check_type,
        ...row.details,
      },
    });
  }
}

async function main() {
  const sb = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });

  await upsertMapping(sb);

  // PI
  const pi = runJson('node', ['skills/eve-esi/eve-esi.mjs', 'pi-check']);
  const piAlerts = indexAlerts(pi.alerts);
  const { data: chars } = await sb.from('eve_character').select('id');
  const charIds = (chars || []).map((c) => c.id);

  const piRun = await insertRun(sb, 'pi', { fetched_at: pi.fetched_at, rules: pi.rules });
  await insertCharacterChecks(
    sb,
    piRun,
    charIds.map((id) => {
      const alerts = piAlerts.get(id) || [];
      return {
        character_id: id,
        status: alerts.length ? 'fail' : 'pass',
        details: { alerts },
      };
    }),
    'pi'
  );

  // Skill queue
  const sq = runJson('node', ['skills/eve-esi/eve-esi.mjs', 'skillq-check']);
  const sqAlerts = indexAlerts(sq.alerts);
  const sqRun = await insertRun(sb, 'skillq', { fetched_at: sq.fetched_at });
  await insertCharacterChecks(
    sb,
    sqRun,
    (sq.characters || []).map((c) => {
      const id = c.character.id;
      const alerts = sqAlerts.get(id) || [];
      // If ESI returns status != active, treat as warn/fail.
      const derived = alerts.length ? 'fail' : (c.status === 'active' ? 'pass' : 'warn');
      return {
        character_id: id,
        status: derived,
        details: { status: c.status, queue_length: c.queue_length, alerts },
      };
    }),
    'skillq'
  );

  // Industry
  const ind = runJson('node', ['skills/eve-esi/eve-esi.mjs', 'industry-check']);
  const indAlerts = indexAlerts(ind.alerts);
  const indRun = await insertRun(sb, 'industry', { fetched_at: ind.fetched_at });
  await insertCharacterChecks(
    sb,
    indRun,
    (ind.characters || []).map((c) => {
      const id = c.character.id;
      const alerts = indAlerts.get(id) || [];
      return {
        character_id: id,
        status: alerts.length ? 'fail' : 'pass',
        details: { ready_total: c.ready_total, newly_ready_count: c.newly_ready_count, alerts },
      };
    }),
    'industry'
  );

  // Contract scan (public, not per character)
  const con = runJson('node', ['skills/eve-contract-scan/eve-contract-scan.mjs', 'scan']);
  const conRun = await insertRun(sb, 'contract', { scanned: con.scanned });
  await insertCharacterChecks(
    sb,
    conRun,
    (con.alerts || []).map((a) => ({
      character_id: null,
      status: 'fail',
      details: { alert: a },
    })),
    'contract'
  );

  console.log(JSON.stringify({ ok: true, at: nowIso() }, null, 2));
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});

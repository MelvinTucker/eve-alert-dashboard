import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

function fmt(ts?: string | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

export default async function Home() {
  const sb = supabaseServer();

  const { data: runs } = await sb
    .from('eve_check_run')
    .select('id,check_type,started_at,finished_at')
    .order('started_at', { ascending: false })
    .limit(50);

  type RunRow = { id: string; check_type: string; started_at: string; finished_at: string | null };
  const latestByType = new Map<string, RunRow>();
  for (const r of (runs || []) as RunRow[]) {
    if (!latestByType.has(r.check_type)) latestByType.set(r.check_type, r);
  }

  const { data: failCounts } = await sb
    .from('eve_character_check')
    .select('status,run_id')
    .in('status', ['fail', 'warn']);

  const failTotal = (failCounts || []).length;

  const types = ['pi', 'skillq', 'industry', 'contract'] as const;

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>EVE Watcher Dashboard</h1>
      <p>
        <Link href="/accounts">View by account group</Link>
      </p>

      <h2>Latest checks</h2>
      <ul>
        {types.map((t) => {
          const r = latestByType.get(t);
          return (
            <li key={t}>
              <b>{t}</b>: {r ? fmt(r.finished_at ?? r.started_at) : '—'}
            </li>
          );
        })}
      </ul>

      <h2>Current issues</h2>
      <p>fail/warn rows in recent history: {failTotal}</p>

      <p style={{ marginTop: 24, color: '#666' }}>
        MVP: data is ingested from VPS watcher runs into Supabase.
      </p>
    </main>
  );
}

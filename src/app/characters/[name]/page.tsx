import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

function fmt(ts?: string | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

async function latestCheck(sb: ReturnType<typeof supabaseServer>, characterId: number, checkType: string) {
  const { data } = await sb
    .from('eve_character_check')
    .select('status,checked_at,details')
    .eq('character_id', characterId)
    .eq('check_type', checkType)
    .order('checked_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export default async function CharacterPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const sb = supabaseServer();

  const { data: ch } = await sb
    .from('eve_character')
    .select('id,name,account_group_id, eve_account_group(name)')
    .eq('name', name)
    .maybeSingle();

  if (!ch) {
    return (
      <main style={{ padding: 24 }}>
        <p>Unknown character.</p>
        <Link href="/accounts">Back</Link>
      </main>
    );
  }

  const [pi, sq, ind] = await Promise.all([
    latestCheck(sb, ch.id, 'pi'),
    latestCheck(sb, ch.id, 'skillq'),
    latestCheck(sb, ch.id, 'industry'),
  ]);

  const { data: stats } = await sb
    .from('eve_character_stats_latest')
    .select('total_sp,wallet_isk,updated_at')
    .eq('character_id', ch.id)
    .maybeSingle();

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>{ch.name}</h1>
      <p>
        Group:{' '}
        <b>{(ch as { eve_account_group?: { name?: string | null } | null }).eve_account_group?.name ?? '—'}</b>
      </p>

      <h2>Latest checks</h2>
      <ul>
        <li>
          <b>PI</b>: {pi?.status ?? '—'} @ {fmt(pi?.checked_at)}
        </li>
        <li>
          <b>Skill queue</b>: {sq?.status ?? '—'} @ {fmt(sq?.checked_at)} (queue_length: {sq?.details?.queue_length ?? '—'})
        </li>
        <li>
          <b>Industry</b>: {ind?.status ?? '—'} @ {fmt(ind?.checked_at)} (ready_total: {ind?.details?.ready_total ?? '—'})
        </li>
      </ul>

      <h2>Stats</h2>
      <ul>
        <li>
          <b>Total SP</b>: {stats?.total_sp ?? '—'}
        </li>
        <li>
          <b>Wallet ISK</b>: {stats?.wallet_isk ?? '—'}
        </li>
        <li>
          <b>Stats updated</b>: {fmt(stats?.updated_at)}
        </li>
      </ul>

      <h2>Alert details (raw)</h2>
      <details>
        <summary>PI raw</summary>
        <pre>{JSON.stringify(pi?.details ?? null, null, 2)}</pre>
      </details>
      <details>
        <summary>Skillq raw</summary>
        <pre>{JSON.stringify(sq?.details ?? null, null, 2)}</pre>
      </details>
      <details>
        <summary>Industry raw</summary>
        <pre>{JSON.stringify(ind?.details ?? null, null, 2)}</pre>
      </details>

      <p style={{ marginTop: 24 }}>
        <Link href="/accounts">← Back</Link>
      </p>
    </main>
  );
}

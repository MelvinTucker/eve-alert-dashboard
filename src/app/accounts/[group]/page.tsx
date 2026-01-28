import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

function fmt(ts?: string | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

async function latestStatusForCharacter(sb: ReturnType<typeof supabaseServer>, characterId: number) {
  const { data } = await sb
    .from('eve_character_check')
    .select('status,checked_at,details')
    .eq('character_id', characterId)
    .order('checked_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export default async function GroupPage({ params }: { params: Promise<{ group: string }> }) {
  const { group } = await params;
  const sb = supabaseServer();

  const { data: grp } = await sb
    .from('eve_account_group')
    .select('id,name')
    .eq('name', group)
    .maybeSingle();

  if (!grp) {
    return (
      <main style={{ padding: 24 }}>
        <p>Unknown group.</p>
        <Link href="/accounts">Back</Link>
      </main>
    );
  }

  const { data: chars } = await sb
    .from('eve_character')
    .select('id,name')
    .eq('account_group_id', grp.id)
    .order('name');

  const rows: Array<{ id: number; name: string; latest: unknown }> = [];
  for (const c of chars || []) {
    const latest = await latestStatusForCharacter(sb, c.id);
    rows.push({ id: c.id, name: c.name, latest });
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Group: {grp.name}</h1>
      <ul>
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/characters/${encodeURIComponent(r.name)}`}>{r.name}</Link>
            {' — '}
            <b>{(r.latest as { status?: string | null } | null)?.status ?? '—'}</b>
            {' — '}
            {fmt((r.latest as { checked_at?: string | null } | null)?.checked_at)}
          </li>
        ))}
      </ul>
      <p>
        <Link href="/accounts">← Back</Link>
      </p>
    </main>
  );
}

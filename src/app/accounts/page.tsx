import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export default async function Accounts() {
  const sb = supabaseServer();
  const { data: groups } = await sb
    .from('eve_account_group')
    .select('id,name')
    .order('name');

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Account groups</h1>
      <ul>
        {(groups || []).map((g) => (
          <li key={g.id}>
            <Link href={`/accounts/${encodeURIComponent(g.name)}`}>{g.name}</Link>
          </li>
        ))}
      </ul>
      <p>
        <Link href="/">← Back</Link>
      </p>
    </main>
  );
}

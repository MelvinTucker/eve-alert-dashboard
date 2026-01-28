import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = supabaseServer();

  const { count, error } = await sb
    .from('eve_check_run')
    .select('*', { count: 'exact', head: true });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error,
        has_SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
        has_SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, eve_check_run_count: count ?? 0 });
}

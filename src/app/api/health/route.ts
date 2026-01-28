import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sb = supabaseServer();
    const { count, error } = await sb
      .from('eve_check_run')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    return NextResponse.json({ ok: true, eve_check_run_count: count ?? 0 });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || String(e),
        has_SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
        has_SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      },
      { status: 500 }
    );
  }
}

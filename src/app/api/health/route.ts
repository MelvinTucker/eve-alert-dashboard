import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sb = supabaseServer();

    const { data, count, error } = await sb
      .from('eve_check_run')
      .select('id', { count: 'exact' })
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error,
          key_len: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').length,
          has_SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
          has_SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, eve_check_run_count: count ?? 0, sample: data?.[0] ?? null });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        exception: e?.message || String(e),
        key_len: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').length,
        has_SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
        has_SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      },
      { status: 500 }
    );
  }
}

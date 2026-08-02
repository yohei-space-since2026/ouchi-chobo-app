import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from('kakeibo_methods')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ methods: data });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { name } = body;
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const { data: maxRow } = await supabaseAdmin()
    .from('kakeibo_methods')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.sort_order || 0) + 1;

  const { data, error } = await supabaseAdmin()
    .from('kakeibo_methods')
    .insert({ name, sort_order: nextOrder })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ method: data });
}

export async function DELETE(request) {
  const name = request.nextUrl.searchParams.get('name');
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  const { error } = await supabaseAdmin().from('kakeibo_methods').delete().eq('name', name);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

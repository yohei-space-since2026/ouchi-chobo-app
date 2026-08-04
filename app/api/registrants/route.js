import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from('kakeibo_registrants')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ registrants: data });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { name } = body;
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const { data: maxRow } = await supabaseAdmin()
    .from('kakeibo_registrants')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.sort_order || 0) + 1;

  const { data, error } = await supabaseAdmin()
    .from('kakeibo_registrants')
    .insert({ name, sort_order: nextOrder })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ registrant: data });
}

export async function PATCH(request) {
  const body = await request.json().catch(() => ({}));
  const { id, name } = body;
  if (!id || !name) return NextResponse.json({ error: 'id and name are required' }, { status: 400 });

  const { data: current } = await supabaseAdmin().from('kakeibo_registrants').select('name').eq('id', id).maybeSingle();

  const { data, error } = await supabaseAdmin()
    .from('kakeibo_registrants')
    .update({ name })
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 既存の支出データの「入力者」表記も新しい名前に揃える
  if (current && current.name !== name) {
    await supabaseAdmin().from('kakeibo_expenses').update({ who: name }).eq('who', current.name);
  }

  return NextResponse.json({ registrant: data });
}

export async function DELETE(request) {
  const name = request.nextUrl.searchParams.get('name');
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  const { error } = await supabaseAdmin().from('kakeibo_registrants').delete().eq('name', name);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

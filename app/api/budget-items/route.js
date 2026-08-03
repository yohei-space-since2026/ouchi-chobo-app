import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const VALID_TYPES = ['income', 'fixed', 'variable', 'asset'];

export async function GET(request) {
  const month = request.nextUrl.searchParams.get('month');
  const noCarry = request.nextUrl.searchParams.get('noCarry') === '1';
  if (!month) return NextResponse.json({ error: 'month is required' }, { status: 400 });

  const db = supabaseAdmin();
  const { data: current, error } = await db
    .from('kakeibo_budget_items')
    .select('*')
    .eq('month', month)
    .order('type', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (current.length > 0 || noCarry) {
    return NextResponse.json({ items: current, carried: false });
  }

  // その月にまだ何もなければ、直近で入力がある月からコピーして引き継ぐ
  const { data: prevAny } = await db
    .from('kakeibo_budget_items')
    .select('month')
    .lt('month', month)
    .order('month', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!prevAny) {
    return NextResponse.json({ items: [], carried: false });
  }

  const { data: prevItems } = await db
    .from('kakeibo_budget_items')
    .select('*')
    .eq('month', prevAny.month);

  if (!prevItems || prevItems.length === 0) {
    return NextResponse.json({ items: [], carried: false });
  }

  const toInsert = prevItems.map((it) => ({
    month,
    type: it.type,
    label: it.label,
    amount: it.amount,
    sort_order: it.sort_order
  }));
  const { data: inserted, error: insertError } = await db
    .from('kakeibo_budget_items')
    .insert(toInsert)
    .select();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ items: inserted, carried: true, carriedFrom: prevAny.month });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { month, type, label, amount } = body;
  if (!month || !type || !label) {
    return NextResponse.json({ error: 'month, type, label は必須です' }, { status: 400 });
  }
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: `type は ${VALID_TYPES.join('/')} のみ有効です` }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { data: maxRow } = await db
    .from('kakeibo_budget_items')
    .select('sort_order')
    .eq('month', month)
    .eq('type', type)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.sort_order || 0) + 1;

  const { data, error } = await db
    .from('kakeibo_budget_items')
    .insert({ month, type, label, amount: Math.round(Number(amount)) || 0, sort_order: nextOrder })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function PATCH(request) {
  const body = await request.json().catch(() => ({}));
  const { id, label, amount } = body;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const update = {};
  if (label !== undefined) update.label = label;
  if (amount !== undefined) update.amount = Math.round(Number(amount)) || 0;

  const { data, error } = await supabaseAdmin()
    .from('kakeibo_budget_items')
    .update(update)
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(request) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const { error } = await supabaseAdmin().from('kakeibo_budget_items').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function GET(request) {
  const month = request.nextUrl.searchParams.get('month'); // 'YYYY-MM'
  if (!month) return NextResponse.json({ error: 'month is required' }, { status: 400 });
  const from = `${month}-01`;
  const [y, m] = month.split('-').map(Number);
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;

  const { data, error } = await supabaseAdmin()
    .from('kakeibo_expenses')
    .select('*')
    .gte('date', from)
    .lt('date', nextMonth)
    .order('date', { ascending: false })
    .order('id', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ expenses: data });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { date, amount, category, method, who, store, memo } = body;
  if (!date || !amount || !category || !method) {
    return NextResponse.json({ error: 'date, amount, category, method は必須です' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin()
    .from('kakeibo_expenses')
    .insert({
      date,
      amount: Math.round(Number(amount)),
      category,
      method,
      who: who || null,
      store: store || null,
      memo: memo || null
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ expense: data });
}

export async function PATCH(request) {
  const body = await request.json().catch(() => ({}));
  const { id, date, amount, category, method, who, store, memo } = body;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const update = {};
  if (date !== undefined) update.date = date;
  if (amount !== undefined) update.amount = Math.round(Number(amount));
  if (category !== undefined) update.category = category;
  if (method !== undefined) update.method = method;
  if (who !== undefined) update.who = who || null;
  if (store !== undefined) update.store = store || null;
  if (memo !== undefined) update.memo = memo || null;

  const { data, error } = await supabaseAdmin()
    .from('kakeibo_expenses')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ expense: data });
}

export async function DELETE(request) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const { error } = await supabaseAdmin().from('kakeibo_expenses').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

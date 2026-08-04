import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function GET() {
  const { data, error } = await supabaseAdmin().from('kakeibo_budgets').select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const budgets = {};
  for (const row of data) budgets[row.category_name] = row.amount;
  return NextResponse.json({ budgets });
}

export async function PUT(request) {
  const body = await request.json().catch(() => ({}));
  const budgets = body.budgets; // { categoryName: amount, ... }
  if (!budgets || typeof budgets !== 'object') {
    return NextResponse.json({ error: 'budgets object is required' }, { status: 400 });
  }
  const rows = Object.entries(budgets).map(([category_name, amount]) => {
    let n = Math.round(Number(amount));
    if (!Number.isFinite(n) || n < 0) n = 0;
    if (n > 999999999) n = 999999999; // Postgres integer範囲を超えないように上限を設ける
    return { category_name, amount: n };
  });
  const { error } = await supabaseAdmin().from('kakeibo_budgets').upsert(rows, { onConflict: 'category_name' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

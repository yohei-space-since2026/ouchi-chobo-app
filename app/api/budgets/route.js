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
  const rows = Object.entries(budgets).map(([category_name, amount]) => ({
    category_name,
    amount: Math.round(Number(amount)) || 0
  }));
  const { error } = await supabaseAdmin().from('kakeibo_budgets').upsert(rows, { onConflict: 'category_name' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

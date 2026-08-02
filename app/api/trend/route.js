import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

function monthKeyOffset(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}

export async function GET() {
  const months = [];
  for (let i = 5; i >= 0; i--) months.push(monthKeyOffset(-i));

  const from = `${months[0].y}-${String(months[0].m).padStart(2, '0')}-01`;
  const last = months[months.length - 1];
  const nextY = last.m === 12 ? last.y + 1 : last.y;
  const nextM = last.m === 12 ? 1 : last.m + 1;
  const to = `${nextY}-${String(nextM).padStart(2, '0')}-01`;

  const { data, error } = await supabaseAdmin()
    .from('kakeibo_expenses')
    .select('date, amount')
    .gte('date', from)
    .lt('date', to);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const totals = months.map(({ y, m }) => {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const label = `${y}年${m}月`;
    const total = data
      .filter((row) => row.date.startsWith(key))
      .reduce((s, row) => s + Number(row.amount), 0);
    return { key, label, total };
  });

  return NextResponse.json({ months: totals });
}

import { createClient } from '@supabase/supabase-js';

let client = null;

// 重要: これはサーバー側（APIルート）からのみ import すること。
// SUPABASE_SERVICE_ROLE_KEY は NEXT_PUBLIC_ を付けていないため、
// ブラウザ向けバンドルには含まれない。
export function supabaseAdmin() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です（.env.local を確認してください）');
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

-- おうち帳簿用テーブル（既存の燃費記録アプリのテーブルとは kakeibo_ 接頭辞で分離）

create table if not exists kakeibo_categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  color text not null,
  sort_order int not null default 0
);

create table if not exists kakeibo_methods (
  id bigint generated always as identity primary key,
  name text not null unique,
  sort_order int not null default 0
);

create table if not exists kakeibo_budgets (
  category_name text primary key references kakeibo_categories(name) on delete cascade,
  amount integer not null default 0
);

create table if not exists kakeibo_expenses (
  id bigint generated always as identity primary key,
  date date not null,
  amount integer not null,
  category text not null,
  method text not null,
  who text,
  memo text,
  created_at timestamptz not null default now()
);

create index if not exists kakeibo_expenses_date_idx on kakeibo_expenses (date);

-- RLS を有効化し、ポリシーは一切作らない
-- （= anon/authenticated 経由の直接アクセスは全拒否。
--    サーバー側の service_role キーだけが RLS をバイパスしてアクセスできる）
alter table kakeibo_categories enable row level security;
alter table kakeibo_methods    enable row level security;
alter table kakeibo_budgets    enable row level security;
alter table kakeibo_expenses   enable row level security;

-- 初期データ
insert into kakeibo_categories (name, color, sort_order) values
  ('食費', '#8FA888', 1),
  ('外食費', '#D4A94A', 2),
  ('日用品費', '#7B98AC', 3),
  ('娯楽費', '#C1694F', 4),
  ('医療費', '#A79CB0', 5),
  ('交通費', '#C98C82', 6)
on conflict (name) do nothing;

insert into kakeibo_methods (name, sort_order) values
  ('現金', 1),
  ('クレジットカード', 2),
  ('楽天Pay', 3),
  ('その他', 4)
on conflict (name) do nothing;

insert into kakeibo_budgets (category_name, amount) values
  ('食費', 60000),
  ('外食費', 15000),
  ('日用品費', 10000),
  ('娯楽費', 10000),
  ('医療費', 5000),
  ('交通費', 8000)
on conflict (category_name) do nothing;

-- ============================================================
-- 追記（2026-08 update）: 既存プロジェクトにも安全に再実行できます
-- ============================================================

-- 支出：お店の名前とメモを分けて記録
alter table kakeibo_expenses add column if not exists store text;

-- 月次収支（収入・固定費）
create table if not exists kakeibo_budget_items (
  id bigint generated always as identity primary key,
  month text not null,                          -- 'YYYY-MM'
  type text not null check (type in ('income','fixed')),
  label text not null,
  amount integer not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists kakeibo_budget_items_month_idx on kakeibo_budget_items (month);

alter table kakeibo_budget_items enable row level security;
-- ポリシーは作らない（service_role / secret key だけがRLSをバイパスしてアクセスできる）

-- ============================================================
-- 追記（2026-08 update その2）: 支出を固定費/変動費に分け、
-- 手残りの内訳（現金・銀行口座など）も管理できるようにする
-- ============================================================
alter table kakeibo_budget_items drop constraint if exists kakeibo_budget_items_type_check;
alter table kakeibo_budget_items add constraint kakeibo_budget_items_type_check
  check (type in ('income','fixed','variable','asset'));


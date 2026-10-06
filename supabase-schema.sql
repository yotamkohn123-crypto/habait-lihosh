create table members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null unique,
  color text not null default '#1f6f5c'
);

create table shopping_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  category text not null default 'כללי',
  amount text,
  note text,
  is_bought boolean not null default false,
  added_by text not null
);

create table chores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  assigned_to text not null,
  is_completed boolean not null default false,
  due_date text
);

create table fridge_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  content text not null,
  author text not null,
  emoji text not null default '❤️',
  color text not null default 'yellow'
);

create table note_reactions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references fridge_notes(id) on delete cascade,
  emoji text not null,
  author text not null,
  created_at timestamptz not null default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  amount numeric not null,
  category text not null default 'כללי',
  paid_by text not null,
  is_recurring boolean not null default false,
  date date not null default current_date
);

create table events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  category text not null default 'אירוע' check (category in ('יום הולדת', 'אירוע')),
  event_date date not null,
  recurring boolean not null default true,
  created_by text
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  identity text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null
);

alter publication supabase_realtime add table members;
alter publication supabase_realtime add table shopping_items;
alter publication supabase_realtime add table chores;
alter publication supabase_realtime add table fridge_notes;
alter publication supabase_realtime add table note_reactions;
alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table events;

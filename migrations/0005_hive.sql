-- Hall hive: activity log + hashed embeddings + 3-fly consensus memory.
-- Unowned rows (auth off). No pgvector — embeddings stored as JSON text.

create table if not exists hive_events (
  id serial primary key,
  kind text not null,
  flow text not null default 'in',
  actor text not null,
  title text not null,
  body text not null,
  meta text not null default '{}',
  embedding text not null default '[]',
  agreed integer not null default 0,
  status text not null default 'live',
  created_at timestamptz not null default now()
);

create index if not exists hive_events_created_idx on hive_events (created_at desc);
create index if not exists hive_events_kind_idx on hive_events (kind, created_at desc);

create table if not exists hive_memory (
  id serial primary key,
  claim_key text not null unique,
  fact text not null,
  embedding text not null default '[]',
  support integer not null default 0,
  source_event integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hive_votes (
  claim_key text not null,
  fly_index integer not null,
  fact text not null default '',
  created_at timestamptz not null default now(),
  primary key (claim_key, fly_index)
);

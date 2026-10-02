-- Agent catalog, training traces, and IPFS/GitHub backup pointers.
alter table ads add column if not exists cid text;
alter table ads add column if not exists payer text;
alter table ads add column if not exists source text not null default 'wallet';

create table if not exists fly_training (
  id serial primary key,
  role text not null,
  region text not null,
  fn text not null,
  note text not null default '',
  reward double precision not null default 0.2,
  source text not null default 'agent',
  created_at timestamptz not null default now()
);

create index if not exists fly_training_created_idx on fly_training (created_at desc);

create table if not exists donations (
  id serial primary key,
  tier text not null,
  amount_usdc text not null,
  tx_hash text not null,
  source text not null default 'wallet',
  created_at timestamptz not null default now()
);

create table if not exists hall_bundle (
  id integer primary key,
  cid text not null,
  github_url text,
  payload text not null,
  updated_at timestamptz not null default now()
);

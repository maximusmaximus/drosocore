-- Daily fly CI: stake-weighted ballots, fabricated items, IPFS pointers.
-- Unowned rows (auth off). Address is the contributor identity.

create table if not exists ci_cycles (
  id serial primary key,
  day_key text not null unique,
  status text not null default 'open',
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  tally_cid text,
  tally_url text,
  winner_option_id integer,
  item_id integer,
  brief text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists ci_cycles_status_idx on ci_cycles (status, closes_at);

create table if not exists ci_options (
  id serial primary key,
  cycle_id integer not null,
  slot integer not null,
  kind text not null,
  title text not null,
  body text not null,
  sponsor text not null,
  role_id text,
  spec_json text not null default '{}',
  embedding text not null default '[]',
  fly_votes integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ci_options_cycle_idx on ci_options (cycle_id, slot);

create table if not exists ci_fly_ballots (
  cycle_id integer not null,
  fly_index integer not null,
  option_id integer not null,
  created_at timestamptz not null default now(),
  primary key (cycle_id, fly_index)
);

create table if not exists ci_votes (
  cycle_id integer not null,
  address text not null,
  option_id integer not null,
  weight_eth double precision not null,
  created_at timestamptz not null default now(),
  primary key (cycle_id, address)
);

create index if not exists ci_votes_option_idx on ci_votes (option_id);

create table if not exists ci_items (
  id serial primary key,
  cycle_id integer not null,
  option_id integer,
  kind text not null,
  title text not null,
  body text not null,
  spec_json text not null default '{}',
  image_cid text,
  image_url text,
  meta_cid text,
  meta_url text,
  model text not null default '',
  cost_usd double precision not null default 0,
  installed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ci_items_cycle_idx on ci_items (cycle_id desc);

create table if not exists ci_messages (
  id serial primary key,
  cycle_id integer,
  item_id integer,
  actor text not null,
  kind text not null default 'fly',
  body text not null,
  embedding text not null default '[]',
  created_at timestamptz not null default now()
);

create index if not exists ci_messages_cycle_idx on ci_messages (cycle_id desc, id desc);

create table if not exists ci_budget (
  day_key text primary key,
  spent_usd double precision not null default 0,
  calls integer not null default 0
);

create table if not exists ci_contributions (
  id serial primary key,
  address text not null,
  kind text not null,
  amount_eth double precision not null,
  tx_hash text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists ci_contributions_tx_idx on ci_contributions (tx_hash);
create index if not exists ci_contributions_addr_idx on ci_contributions (address);

alter table donations add column if not exists payer text;
alter table donations add column if not exists amount_eth double precision;

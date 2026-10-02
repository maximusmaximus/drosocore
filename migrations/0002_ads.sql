-- Billboard ads + global doubling price. Unowned (auth-off).
create table if not exists ad_meta (
  id integer primary key,
  purchase_count integer not null default 0
);

insert into ad_meta (id, purchase_count)
values (1, 0)
on conflict (id) do nothing;

create table if not exists ads (
  id serial primary key,
  space_id text not null unique,
  image_url text not null,
  tx_hash text not null,
  price_eth text not null,
  created_at timestamptz not null default now()
);

create index if not exists ads_created_at_idx on ads (created_at);

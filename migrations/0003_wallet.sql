-- SIWE nonces. Unowned (auth-off). Address is the identity.
create table if not exists wallet_nonces (
  nonce text primary key,
  created_at timestamptz not null default now()
);

create index if not exists wallet_nonces_created_at_idx on wallet_nonces (created_at);

-- MCP pairing keys bound to a wallet. Unowned rows (auth off).
-- Address is the contributor identity; the token is the MCP credential.

create table if not exists mcp_keys (
  address text primary key,
  token text not null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  rotated_at timestamptz
);

create index if not exists mcp_keys_hash_idx on mcp_keys (token_hash);

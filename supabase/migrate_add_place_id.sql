-- OhMagpie TreasureHunter — Migration: add Google Place ID
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- This prevents duplicate shops when the crawler runs multiple times

alter table shops add column if not exists google_place_id text unique;
alter table shops add column if not exists source text default 'manual';
alter table shops add column if not exists raw_address text;

create index if not exists shops_place_id_idx on shops(google_place_id);

-- Also add a full-text search index for shop name + town
create index if not exists shops_name_idx on shops using gin(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(town,'') || ' ' || coalesce(county,'')));

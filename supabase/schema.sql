-- ============================================================================
-- HUSHROOM · PostgreSQL schema (Supabase). Run in order in the SQL editor.
-- Zero-trust rules: clients read public rows and write ONLY their own rows.
-- Anything that unlocks value (entitlements, inventory, rewards, publishing,
-- bans, prices) is written exclusively by edge functions using the service role.
-- ============================================================================
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------- identities & roles -------------------------------------------------
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null default 'Night listener' check (char_length(display_name) between 1 and 40),
  handle        text unique check (handle ~ '^[a-z0-9_]{3,24}$'),
  status        text not null default 'active' check (status in ('active','shadowbanned','banned')),
  mature_opt_in boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- The owner role is granted by hand ONCE in SQL; the app never touches this table.
create table if not exists admin_users (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  role         text not null check (role in ('owner','moderator')),
  webauthn_required boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists admin_audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid not null references auth.users(id),
  action      text not null,
  target_type text not null,
  target_id   text,
  payload     jsonb not null default '{}',
  ip          inet,
  created_at  timestamptz not null default now()
);

-- ---------- sound catalog (developer-controlled tiering) -------------------------
create table if not exists sound_packs (
  id           text primary key,                       -- 'campfire'
  title        text not null,
  short        text not null,
  blurb        text not null default '',
  price_cents  integer not null default 0 check (price_cents >= 0),
  product_id   text unique,                            -- 'hushroom.pack.campfire' (App Store / Play product)
  cover_key    text not null default 'missing',
  mature       boolean not null default false,
  published    boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists sounds (
  id           text primary key,                       -- 'campfire/campfire'
  pack_id      text not null references sound_packs(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 80),
  family       text not null,                          -- synth recipe family (fallback when no file)
  is_premium   boolean not null default true,          -- <<< THE ONE FLAG THE DEVELOPER FLIPS >>>
  mature       boolean not null default false,
  audio_key    text not null unique,                   -- storage path 'audio/campfire/campfire.m4a'
  loudness_lufs numeric,                               -- filled by the ingest worker (-23 target)
  duration_s   numeric,
  cover_key    text not null default 'missing',
  tags         text[] not null default '{}',
  published    boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists sounds_pack_idx        on sounds(pack_id);
create index if not exists sounds_tags_gin        on sounds using gin (tags);
create index if not exists sounds_title_trgm      on sounds using gin (title gin_trgm_ops);
create index if not exists sounds_public_idx      on sounds(published, is_premium) where published;

-- RULE OF 3: a sold pack cannot be published unless ≥3 of its sounds are free.
create or replace function enforce_rule_of_three() returns trigger language plpgsql as $$
declare free_count integer;
begin
  if new.published and new.price_cents > 0 then
    select count(*) into free_count from sounds s where s.pack_id = new.id and s.is_premium = false and s.published;
    if free_count < 3 then
      raise exception 'Pack % needs at least 3 free published sounds before it can be sold (has %)', new.id, free_count;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_rule_of_three on sound_packs;
create trigger trg_rule_of_three before insert or update on sound_packs for each row execute function enforce_rule_of_three();

-- Also block flipping the last free sound to premium in a sold, published pack.
create or replace function protect_free_minimum() returns trigger language plpgsql as $$
declare free_count integer; sold boolean;
begin
  select (price_cents > 0 and published) into sold from sound_packs where id = new.pack_id;
  if sold and new.is_premium and (old.is_premium = false) then
    select count(*) into free_count from sounds where pack_id = new.pack_id and is_premium = false and published and id <> new.id;
    if free_count < 3 then raise exception 'Cannot make % premium: pack % would drop below 3 free sounds', new.id, new.pack_id; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_protect_free_minimum on sounds;
create trigger trg_protect_free_minimum before update on sounds for each row execute function protect_free_minimum();

-- ---------- community & generation ------------------------------------------------
create table if not exists community_assets (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references profiles(id) on delete cascade,
  kind          text not null check (kind in ('audio','image')),
  title         text not null check (char_length(title) between 1 and 80),
  prompt        text check (char_length(prompt) <= 280),
  family        text,
  storage_key   text unique,
  sha256        text,
  tags          text[] not null default '{}',
  visibility    text not null default 'private' check (visibility in ('private','review','public','blocked')),
  provider      text,                                   -- 'huggingface:facebook/musicgen-small' etc.
  provider_meta jsonb not null default '{}',
  created_at    timestamptz not null default now()
);
create index if not exists community_public_idx on community_assets(created_at desc, id) where visibility = 'public';
create index if not exists community_tags_gin   on community_assets using gin (tags);
create index if not exists community_title_trgm on community_assets using gin (title gin_trgm_ops);

create table if not exists generation_jobs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  idempotency_key text not null,
  prompt_raw      text not null,
  prompt_clean    text not null,
  moderation      jsonb not null default '{}',           -- OpenAI moderation response
  status          text not null default 'queued' check (status in ('queued','moderating','blocked','generating','ready','failed')),
  result_asset_id uuid references community_assets(id),
  error           text,
  created_at      timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists moderation_events (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  target_type text not null,
  target_id   text not null,
  decision    text not null check (decision in ('allow','block','review','ban')),
  reasons     jsonb not null default '[]',
  created_at  timestamptz not null default now()
);

-- ---------- commerce ------------------------------------------------------------
create table if not exists products (
  id           text primary key,                        -- 'hushroom.remove_ads', 'hushroom.pack.campfire', 'hushroom.item.pet-cat'
  kind         text not null check (kind in ('remove_ads','sound_pack','item','theme','interior','holiday','donation')),
  ref_id       text,                                    -- pack id / catalog item id
  price_cents  integer not null,
  active       boolean not null default true
);

create table if not exists entitlements (
  user_id                 uuid not null references profiles(id) on delete cascade,
  product_id              text not null references products(id),
  store                   text not null check (store in ('apple','google','reward','admin')),
  original_transaction_id text not null,
  status                  text not null check (status in ('active','refunded','revoked')),
  verified_at             timestamptz not null default now(),
  primary key (user_id, product_id),
  unique (store, original_transaction_id)
);

-- ---------- catalog items, inventory, room, avatar -------------------------------
create table if not exists catalog_items (
  id           text primary key,                        -- 'pet-cat', 'furniture-sofa', 'interior-log-cabin', 'outfit-expr-coy'
  kind         text not null check (kind in ('pet','aquarium','furniture','decor','interior','theme','outfit','holiday')),
  name         text not null,
  blurb        text not null default '',
  price_cents  integer not null default 0,
  product_id   text references products(id),
  sprite_key   text,
  behavior     text check (behavior in ('seat','bed','appliance','light','tank','decor')),
  species      text,
  interior_id  text,
  theme_id     text,
  outfit       jsonb,                                   -- {"slot":"expression","value":"coy","label":"Coy"}
  bundle       text[] not null default '{}',            -- holiday sets
  published    boolean not null default false
);

create table if not exists user_inventory (
  user_id     uuid not null references profiles(id) on delete cascade,
  item_id     text not null references catalog_items(id),
  source      text not null check (source in ('starter','purchase','bundle','reward','admin')),
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists room_layouts (
  user_id     uuid primary key references profiles(id) on delete cascade,
  interior_id text not null default 'rainroom',
  tv_mode     text not null default 'ads' check (tv_mode in ('ads','ambient','static','removed')),
  updated_at  timestamptz not null default now()
);

create table if not exists room_items (
  uid        uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  item_id    text not null references catalog_items(id),
  u          numeric not null check (u between 0 and 1),   -- isometric floor coords
  v          numeric not null check (v between 0 and 1),
  z_index    integer not null default 0,
  placed_at  timestamptz not null default now()
);
create index if not exists room_items_user_idx on room_items(user_id);

create table if not exists avatars (
  user_id      uuid primary key references profiles(id) on delete cascade,
  skin         text not null default '#ecc4a4',
  hair         text not null default 'bob',
  hair_color   text not null default '#5a3a25',
  expression   text not null default 'smile',
  top          text not null default 'hoodie',
  top_color    text not null default '#cfe3c4',
  bottom       text not null default 'jeans',
  bottom_color text not null default '#5f6f8f',
  accessory    text,
  updated_at   timestamptz not null default now()
);

-- ---------- favorites & EQ -------------------------------------------------------
create table if not exists favorite_mixes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  master_eq   numeric[] not null default '{0,0,0,0,0}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists favorite_user_idx on favorite_mixes(user_id, updated_at desc);

create table if not exists favorite_mix_tracks (
  favorite_id uuid not null references favorite_mixes(id) on delete cascade,
  position    integer not null check (position between 0 and 7),
  sound_id    text not null,                              -- 'campfire/campfire' or community uuid
  volume      numeric not null default 0.6 check (volume between 0 and 1),
  track_eq    numeric[] not null default '{0,0,0}',
  primary key (favorite_id, position)
);

-- ---------- settings, feedback, holiday campaigns --------------------------------
create table if not exists user_settings (
  user_id       uuid primary key references profiles(id) on delete cascade,
  theme_id      text not null default 'rainroom',
  tips_enabled  boolean not null default true,
  haptics       boolean not null default true,
  reduce_motion boolean not null default false,
  sleep_timer_m integer not null default 60 check (sleep_timer_m between 30 and 180),
  alarm         jsonb not null default '{"enabled":false,"time":"07:00","snoozeMinutes":10,"snoozeOptions":[5,10,15,20,30],"shakeToDismiss":true,"weather":true,"forceSpeaker":true}',
  updated_at    timestamptz not null default now()
);

create table if not exists feedback (
  id         bigint generated always as identity primary key,
  user_id    uuid references profiles(id) on delete set null,
  body       text not null check (char_length(body) <= 600),
  moderation jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists holiday_campaigns (
  id             text primary key,                        -- 'christmas-2026'
  name           text not null,
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  set_item_id    text not null references catalog_items(id),
  reward_item_id text not null references catalog_items(id),
  required_days  integer not null default 7,
  enabled        boolean not null default false
);

create table if not exists holiday_checkins (
  campaign_id text not null references holiday_campaigns(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  day         date not null,
  primary key (campaign_id, user_id, day)
);

create table if not exists holiday_claims (
  campaign_id text not null references holiday_campaigns(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  claimed_at  timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

-- Server function (edge functions call this): record today's open, grant reward once at 7 distinct days.
create or replace function holiday_checkin(p_campaign text, p_user uuid) returns jsonb language plpgsql security definer as $$
declare c holiday_campaigns; days integer;
begin
  select * into c from holiday_campaigns where id = p_campaign and enabled and now() between starts_at and ends_at;
  if c.id is null then return jsonb_build_object('granted', false, 'reason', 'inactive'); end if;
  insert into holiday_checkins values (p_campaign, p_user, current_date) on conflict do nothing;
  select count(*) into days from holiday_checkins where campaign_id = p_campaign and user_id = p_user;
  if days >= c.required_days and not exists (select 1 from holiday_claims where campaign_id = p_campaign and user_id = p_user) then
    insert into holiday_claims (campaign_id, user_id) values (p_campaign, p_user);
    insert into user_inventory (user_id, item_id, source) values (p_user, c.reward_item_id, 'reward') on conflict do nothing;
    return jsonb_build_object('granted', true, 'item_id', c.reward_item_id, 'days', days);
  end if;
  return jsonb_build_object('granted', false, 'days', days, 'required', c.required_days);
end $$;

-- ---------- search view ----------------------------------------------------------
create or replace view public_search as
  select 'official' as source, s.id, s.title, s.tags, s.is_premium, s.pack_id, s.cover_key, s.created_at from sounds s where s.published
  union all
  select 'community', a.id::text, a.title, a.tags, false, 'community', 'missing', a.created_at from community_assets a where a.visibility = 'public';

-- ---------- row level security ----------------------------------------------------
alter table profiles enable row level security;
alter table sounds enable row level security;
alter table sound_packs enable row level security;
alter table community_assets enable row level security;
alter table generation_jobs enable row level security;
alter table entitlements enable row level security;
alter table user_inventory enable row level security;
alter table room_layouts enable row level security;
alter table room_items enable row level security;
alter table avatars enable row level security;
alter table favorite_mixes enable row level security;
alter table favorite_mix_tracks enable row level security;
alter table user_settings enable row level security;
alter table feedback enable row level security;
alter table holiday_checkins enable row level security;
alter table holiday_claims enable row level security;
alter table admin_users enable row level security;
alter table admin_audit_log enable row level security;

create policy "profiles self read"   on profiles for select using (auth.uid() = id);
create policy "profiles self update" on profiles for update using (auth.uid() = id) with check (auth.uid() = id and status = (select status from profiles p where p.id = auth.uid()));
create policy "sounds public"        on sounds for select using (published);
create policy "packs public"         on sound_packs for select using (published);
create policy "community public or own" on community_assets for select using (visibility = 'public' or owner_id = auth.uid());
create policy "community own insert" on community_assets for insert with check (owner_id = auth.uid() and visibility = 'private');
create policy "community own update" on community_assets for update using (owner_id = auth.uid()) with check (owner_id = auth.uid() and visibility in ('private','review'));
create policy "jobs own"             on generation_jobs for select using (user_id = auth.uid());
create policy "entitlements own read" on entitlements for select using (user_id = auth.uid());     -- no client writes, ever
create policy "inventory own read"   on user_inventory for select using (user_id = auth.uid());    -- no client writes, ever
create policy "room own"             on room_layouts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "room items own"       on room_items for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from user_inventory i where i.user_id = auth.uid() and i.item_id = room_items.item_id));
create policy "avatar own"           on avatars for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "fav own"              on favorite_mixes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "fav tracks own"       on favorite_mix_tracks for all using (exists (select 1 from favorite_mixes f where f.id = favorite_id and f.user_id = auth.uid()));
create policy "settings own"         on user_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "feedback insert"      on feedback for insert with check (user_id = auth.uid());
create policy "checkins own read"    on holiday_checkins for select using (user_id = auth.uid());
create policy "claims own read"      on holiday_claims for select using (user_id = auth.uid());
-- admin_users / admin_audit_log: no policies → invisible to every client; service role only.

-- ---------- seed: products + the six sold packs (mirror of src/data/soundCatalog.ts) ------
insert into products (id, kind, ref_id, price_cents) values
  ('hushroom.remove_ads','remove_ads',null,500),
  ('hushroom.pack.campfire','sound_pack','campfire',100),
  ('hushroom.pack.weather','sound_pack','weather',100),
  ('hushroom.pack.transit','sound_pack','transit',100),
  ('hushroom.pack.nature','sound_pack','nature',100),
  ('hushroom.pack.cafes','sound_pack','cafes',100),
  ('hushroom.pack.hobbies','sound_pack','hobbies',100)
on conflict do nothing;

-- Sounds are imported by the admin "Import manifest" action which reads src/data/soundCatalog.ts
-- (exported as JSON) and upserts rows with is_premium from the free()/paid() markers.

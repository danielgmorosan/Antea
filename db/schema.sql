-- Antea database schema. Idempotent: safe to re-run.
-- Editorial schema: our content, every claim traceable to a source row.
-- Staging schema: raw imports from external datasets, replaceable, never
-- mixed into editorial tables (see db/vendor/NOTICE.md and docs/CLAUDE.md).

create schema if not exists editorial;
create schema if not exists staging;

-- ---------- editorial ----------

create table if not exists editorial.source (
  id         text primary key,          -- e.g. 'wd:Q16869', 'book:mango-1980'
  kind       text not null check (kind in ('dataset','database','book','article','web')),
  citation   text not null,
  url        text,
  license    text
);

create table if not exists editorial.place (
  slug       text primary key,
  name       text not null,             -- canonical modern-reference name
  kind       text not null default 'city' check (kind in ('city','settlement','site','region')),
  lon        double precision not null,
  lat        double precision not null,
  year_from  integer not null,          -- first flourishing (negative = BC)
  year_to    integer not null,          -- 2100 = continuity to present
  flagship   boolean not null default false,
  wikidata   text,
  pleiades   text
);

-- A place's name through time: the latest row with year_from <= y wins.
create table if not exists editorial.place_name (
  place_slug text not null references editorial.place(slug) on delete cascade,
  year_from  integer not null,
  name       text not null,
  primary key (place_slug, year_from)
);

-- Who ruled, half-open interval [year_from, year_to).
create table if not exists editorial.place_era (
  place_slug text not null references editorial.place(slug) on delete cascade,
  year_from  integer not null,
  year_to    integer not null,
  polity     text not null,
  blurb      text not null,
  source_id  text references editorial.source(id),
  primary key (place_slug, year_from),
  check (year_to > year_from)
);

create table if not exists editorial.place_event (
  place_slug text not null references editorial.place(slug) on delete cascade,
  year       integer not null,
  text       text not null,
  source_id  text references editorial.source(id),
  primary key (place_slug, year)
);

create table if not exists editorial.article (
  place_slug   text primary key references editorial.place(slug) on delete cascade,
  tier         text not null check (tier in ('curated','auto')),
  review_state text not null default 'draft' check (review_state in ('draft','reviewed','published')),
  overview     text not null,
  model        text,                    -- null for human-written
  generated_at timestamptz default now()
);

create table if not exists editorial.article_source (
  place_slug text not null references editorial.article(place_slug) on delete cascade,
  source_id  text not null references editorial.source(id),
  primary key (place_slug, source_id)
);

create index if not exists place_era_by_place on editorial.place_era (place_slug, year_from);
create index if not exists place_event_by_place on editorial.place_event (place_slug, year);
create index if not exists place_by_wikidata on editorial.place (wikidata) where wikidata is not null;

-- ---------- staging (replaceable imports) ----------

create table if not exists staging.hb_place (
  id        serial primary key,
  name      text not null,
  lon       double precision not null,
  lat       double precision not null,
  since     integer,                    -- inhabitedSince (negative = BC)
  until     integer,                    -- inhabitedUntil
  civ       text,                       -- civilizations, comma-joined
  wikidata  text,
  wikipedia text,
  descr     text,
  imported_at timestamptz default now()
);

create index if not exists hb_place_by_name on staging.hb_place (name);
create index if not exists hb_place_by_wikidata on staging.hb_place (wikidata) where wikidata is not null;

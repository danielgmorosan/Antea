-- Editorial schema: places, their eras, and the sourced claims about them.
--
-- The rule this exists to enforce is CLAUDE.md's: every factual claim
-- references a source. In JSON that is a convention a reviewer has to notice;
-- here `claim.source_id` is NOT NULL against a foreign key, so an unsourced
-- claim cannot be stored at all. A gap is recorded as an `unsourced_claim`,
-- which is a different thing and says so.
--
-- No PostGIS here on purpose. Coordinates are plain columns so the editorial
-- schema stays portable and testable without the extension; 0002 adds the
-- spatial layer on top for querying.

CREATE TYPE source_kind AS ENUM (
  'contemporary',
  'later-tradition',
  'modern-scholarship'
);

CREATE TYPE confidence AS ENUM (
  'attested',
  'inferred',
  'approximate'
);

CREATE TYPE licence AS ENUM (
  'CC0',
  'CC-BY',
  'ODbL',
  'public-domain',
  'editorial'
);

-- A citation. Shared across places: Procopius is cited once, not per city.
CREATE TABLE source (
  id          text PRIMARY KEY,
  citation    text NOT NULL CHECK (length(trim(citation)) > 0),
  kind        source_kind NOT NULL,
  url         text CHECK (url IS NULL OR url LIKE 'https://%'),
  note        text,
  licence     licence,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE place (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  name              text NOT NULL,
  lng               double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
  lat               double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  -- The era a visitor lands on when they open the place without naming one.
  default_era_year  integer NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- One place-era pairing: the unit that gets a URL and a dossier.
CREATE TABLE era (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id    uuid NOT NULL REFERENCES place (id) ON DELETE CASCADE,
  -- Negative is BC. There is no year zero, and we do not store one.
  year        integer NOT NULL CHECK (year <> 0),
  year_label  text NOT NULL,
  -- The city's name in this era: Byzantion, Constantinople, Kostantiniyye.
  name        text NOT NULL,
  UNIQUE (place_id, year)
);

CREATE INDEX era_place_year_idx ON era (place_id, year);

CREATE TABLE dossier (
  era_id                 uuid PRIMARY KEY REFERENCES era (id) ON DELETE CASCADE,
  -- Null where we genuinely do not know, rather than a guess standing in.
  population             bigint CHECK (population IS NULL OR population >= 0),
  population_label       text NOT NULL,
  population_confidence  confidence NOT NULL,
  ruler                  text NOT NULL,
  story                  text NOT NULL CHECK (length(trim(story)) > 0),
  seeing                 text NOT NULL CHECK (length(trim(seeing)) > 0)
);

-- A factual assertion, and the source that carries it.
--
-- source_id is NOT NULL. That is the whole point of the table: the database
-- refuses to hold an unsourced claim.
CREATE TABLE claim (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  era_id      uuid NOT NULL REFERENCES era (id) ON DELETE CASCADE,
  -- What is being claimed about, e.g. 'population', 'ruler', 'quotation'.
  subject     text NOT NULL CHECK (length(trim(subject)) > 0),
  statement   text NOT NULL CHECK (length(trim(statement)) > 0),
  confidence  confidence NOT NULL,
  source_id   text NOT NULL REFERENCES source (id) ON DELETE RESTRICT,
  UNIQUE (era_id, subject, source_id)
);

CREATE INDEX claim_era_idx ON claim (era_id);
CREATE INDEX claim_source_idx ON claim (source_id);

-- A claim we have NOT sourced, recorded so the gap is visible instead of
-- looking as though the citations nearby cover it.
CREATE TABLE unsourced_claim (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  era_id      uuid NOT NULL REFERENCES era (id) ON DELETE CASCADE,
  subject     text NOT NULL CHECK (length(trim(subject)) > 0),
  UNIQUE (era_id, subject)
);

-- Which sources a dossier cites, for rendering the footnotes.
CREATE TABLE dossier_source (
  era_id     uuid NOT NULL REFERENCES era (id) ON DELETE CASCADE,
  source_id  text NOT NULL REFERENCES source (id) ON DELETE RESTRICT,
  position   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (era_id, source_id)
);

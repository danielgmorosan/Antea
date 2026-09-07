-- Spatial layer.
--
-- Split from 0001 so the editorial schema can be created, seeded and tested
-- without PostGIS — which matters because the test harness runs Postgres in
-- WASM, where the extension is not available. Production (Neon) runs both.
--
-- Coordinates stay in `lng`/`lat`; this adds a derived geography column so
-- spatial queries and indexes work, without making PostGIS a storage
-- requirement or letting the two representations drift apart.

CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE place
  ADD COLUMN location geography(Point, 4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) STORED;

CREATE INDEX place_location_idx ON place USING gist (location);

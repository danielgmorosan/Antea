-- Claims belong to a place, and only sometimes to one era.
--
-- Ingested facts arrive with their own date ranges, and those ranges are often
-- coarser than our eras. Pleiades records Constantinople's ancient Greek name
-- as spanning 1200 BC to AD 1453 — a period bucket, not an attestation window.
-- Storing that against the 667 BC era would assert that Byzantion was called
-- Konstantinoupolis a thousand years before Constantine refounded it: sourced,
-- and false.
--
-- So a claim hangs off the place, carries the span its source gives it, and
-- names an era only when the source is genuinely that specific.

ALTER TABLE claim ADD COLUMN place_id uuid REFERENCES place (id) ON DELETE CASCADE;

UPDATE claim SET place_id = era.place_id FROM era WHERE era.id = claim.era_id;

ALTER TABLE claim ALTER COLUMN place_id SET NOT NULL;
ALTER TABLE claim ALTER COLUMN era_id DROP NOT NULL;

-- The span the source gives, negative for BC. Null means open-ended.
ALTER TABLE claim ADD COLUMN start_year integer;
ALTER TABLE claim ADD COLUMN end_year integer;
ALTER TABLE claim ADD CONSTRAINT claim_span_ordered
  CHECK (start_year IS NULL OR end_year IS NULL OR start_year <= end_year);

ALTER TABLE claim DROP CONSTRAINT claim_era_id_subject_source_id_key;
CREATE UNIQUE INDEX claim_unique_idx ON claim (place_id, subject, statement, source_id);
CREATE INDEX claim_place_idx ON claim (place_id);

# Vendored data notice

`hb-places.json` is a slimmed extract of `geojson/places.geojson` from
[historical-basemaps](https://github.com/aourednik/historical-basemaps)
(A. Ourednik and contributors, **GPL-3.0**, research-grade).

It is loaded ONLY into the `staging.hb_place` table — never into the
editorial schema. Editorial rows must be written by us or derived from
CC0/CC-BY sources (Wikidata, Pleiades, OHM) with a `source` reference.
Replace this extract with Wikidata/Pleiades ingest in Phase 2, then drop it.

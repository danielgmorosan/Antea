"""The pipeline, exercised entirely against a recorded fixture.

No test here touches the network. Ingest output is committed and reviewed as a
diff, so the properties that matter most are determinism and that a source
travels with every claim.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from antea_pipeline.claims import (
    build_artifact,
    format_years,
    language_label,
    name_claims,
    source_for,
)
from antea_pipeline.pleiades import names_covering, parse_place

FIXTURES = Path(__file__).parent / "fixtures"
PLEIADES_ID = "520998"
# The eras Constantinople actually ships with.
ERA_YEARS = [-667, 537, 1200, 1560]


@pytest.fixture
def place():
    payload = json.loads((FIXTURES / f"pleiades_{PLEIADES_ID}.json").read_text("utf-8"))
    return parse_place(PLEIADES_ID, payload)


class TestParsing:
    def test_reads_the_place_itself(self, place):
        assert place.title == "Constantinopolis"
        assert place.pleiades_id == PLEIADES_ID
        assert place.uri.endswith(PLEIADES_ID)
        assert place.lng == pytest.approx(28.9656, abs=1e-3)
        assert place.lat == pytest.approx(41.0066, abs=1e-3)

    def test_reads_every_name(self, place):
        assert len(place.names) == 14
        romanized = {n.romanized for n in place.names}
        assert "Constantinopolis" in romanized
        assert "Istanbul" in romanized

    def test_marks_a_recorded_form_attested_and_a_romanisation_inferred(self, place):
        by_name = {n.romanized: n for n in place.names}
        # Written down in a source.
        assert by_name["Constantinopolis"].attested == "Constantinopolis"
        assert by_name["Constantinopolis"].confidence == "attested"
        # Romanised by an editor, with no attested form recorded.
        quran = by_name["Quṣtanṭīnīya"]
        assert quran.attested is None
        assert quran.confidence == "inferred"

    def test_carries_the_licence_that_obliges_us(self, place):
        # Pleiades is CC-BY: attribution is required, not optional.
        assert place.licence == "CC-BY"

    def test_survives_a_sparse_record(self):
        place = parse_place("1", {})
        assert place.title == ""
        assert place.names == ()
        assert place.lng is None

    def test_ignores_a_name_with_no_form_at_all(self):
        place = parse_place("1", {"names": [{"language": "la"}, {"romanized": "Roma"}]})
        assert [n.romanized for n in place.names] == ["Roma"]


class TestNamesCoveringAYear:
    def test_finds_the_name_in_use(self, place):
        names = {n.romanized for n in names_covering(place, 537)}
        assert "Constantinopolis" in names
        assert "Istanbul" not in names

    def test_the_city_is_istanbul_today(self, place):
        names = {n.romanized for n in names_covering(place, 2000)}
        assert "Istanbul" in names
        assert "Constantinopolis" not in names

    def test_an_open_ended_bound_stays_open(self):
        place = parse_place(
            "1", {"names": [{"romanized": "Forever", "start": None, "end": None}]}
        )
        assert len(names_covering(place, -5000)) == 1
        assert len(names_covering(place, 3000)) == 1


class TestYearFormatting:
    @pytest.mark.parametrize(
        ("start", "end", "expected"),
        [
            (300, 640, "AD 300 to AD 640"),
            (-667, -330, "667 BC to 330 BC"),
            (-50, 50, "50 BC to AD 50"),
            (330, None, "from AD 330"),
            (None, 1453, "until AD 1453"),
            (1453, 1453, "AD 1453"),
            (None, None, None),
        ],
    )
    def test_reads_the_way_the_dossiers_do(self, start, end, expected):
        assert format_years(start, end) == expected

    def test_labels_a_language_it_knows_and_keeps_one_it_does_not(self):
        assert language_label("grc") == "ancient Greek"
        assert language_label("ota") == "Ottoman Turkish"
        assert language_label("xyz") == "xyz"
        assert language_label(None) is None


class TestClaims:
    def test_no_claim_is_pinned_to_one_of_our_eras(self, place):
        # Pleiades name ranges are broad period buckets, not attestation
        # windows: its ancient Greek form spans 1200 BC to AD 1453. Pinning
        # that to the 667 BC era would assert Byzantion was called
        # Konstantinoupolis a millennium before Constantine. Sourced, false.
        artifact = build_artifact("constantinople", place)
        for claim in artifact["claims"]:
            assert "eraYear" not in claim
            assert {"startYear", "endYear"} <= set(claim)

    def test_claims_read_as_sentences(self, place):
        claims = name_claims(place)
        statements = [c.statement for c in claims]
        assert any("Constantinopolis" in s for s in statements)
        for statement in statements:
            assert statement.endswith(".")

    def test_the_source_carries_its_licence_and_a_followable_url(self, place):
        source = source_for(place)
        assert source.id == f"pleiades-{PLEIADES_ID}"
        assert source.licence == "CC-BY"
        assert source.url.startswith("https://")
        assert source.kind == "modern-scholarship"
        # Pleiades is a modern gazetteer, never a witness to what it records.
        assert source.kind != "contemporary"

    def test_output_is_deterministic(self, place):
        first = build_artifact("constantinople", place)
        second = build_artifact("constantinople", place)
        assert json.dumps(first) == json.dumps(second)

    def test_claims_run_earliest_first(self, place):
        dated = [c for c in name_claims(place) if c.start_year is not None]
        assert [c.start_year for c in dated] == sorted(c.start_year for c in dated)

    def test_carries_no_timestamp_that_would_churn_the_diff(self, place):
        text = json.dumps(build_artifact("constantinople", place))
        for word in ("generatedAt", "timestamp", "fetchedAt"):
            assert word not in text

    def test_the_same_form_is_not_claimed_twice(self, place):
        statements = [c.statement for c in name_claims(place)]
        assert len(statements) == len(set(statements))

    def test_an_artifact_names_exactly_one_source(self, place):
        artifact = build_artifact("constantinople", place)
        assert artifact["place"] == "constantinople"
        assert artifact["gazetteer"] == "pleiades"
        assert isinstance(artifact["source"], dict)
        assert artifact["claims"], "expected at least one claim"

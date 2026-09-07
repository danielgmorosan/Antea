"""Turn gazetteer records into sourced claims about a place.

A claim is a factual statement plus the source that carries it. The database
refuses to store one without a source, so the source travels with the claim
from the moment it is created here.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass

from .pleiades import PleiadesPlace

# Enough ISO 639 codes to label the names we actually encounter. Anything else
# keeps its code rather than being guessed at.
LANGUAGES = {
    "ar": "Arabic",
    "arb": "Arabic",
    "de": "German",
    "en": "English",
    "fr": "French",
    "grc": "ancient Greek",
    "he": "Hebrew",
    "hy": "Armenian",
    "it": "Italian",
    "la": "Latin",
    "ota": "Ottoman Turkish",
    "tr": "Turkish",
}

# Pleiades is a modern scholarly gazetteer, not a witness.
SOURCE_KIND = "modern-scholarship"


def language_label(code: str | None) -> str | None:
    if not code:
        return None
    return LANGUAGES.get(code, code)


def format_years(start: int | None, end: int | None) -> str | None:
    """A readable span. Negative years are BC, and there is no year zero."""

    def year(value: int) -> str:
        return f"{abs(value)} BC" if value < 0 else f"AD {value}"

    if start is None and end is None:
        return None
    if start is None:
        return f"until {year(end)}"  # type: ignore[arg-type]
    if end is None:
        return f"from {year(start)}"
    if start == end:
        return year(start)
    return f"{year(start)} to {year(end)}"


@dataclass(frozen=True, slots=True)
class Claim:
    """One sourced statement about a place, with the span it applies to.

    Deliberately *not* tied to one of our eras. Pleiades records a name's dates
    as broad period buckets rather than attestation windows — its ancient Greek
    form for Constantinople spans 1200 BC to AD 1453 — so pinning such a name
    to the 667 BC era would assert that Byzantion was called Konstantinoupolis
    a thousand years before Constantine refounded it. Sourced, and false.

    The span travels with the claim so a reader can judge it, and so the UI can
    decide how to hedge when it shows a name against an era.
    """

    subject: str
    statement: str
    confidence: str
    start_year: int | None
    end_year: int | None

    def to_json(self) -> dict[str, object]:
        return {
            "subject": self.subject,
            "statement": self.statement,
            "confidence": self.confidence,
            "startYear": self.start_year,
            "endYear": self.end_year,
        }


@dataclass(frozen=True, slots=True)
class SourceRecord:
    """The source row every claim in an artifact references."""

    id: str
    citation: str
    kind: str
    url: str
    licence: str
    note: str | None = None

    def to_json(self) -> dict[str, object]:
        return {k: v for k, v in asdict(self).items() if v is not None}


def source_for(place: PleiadesPlace) -> SourceRecord:
    note = "Attested name forms and their date ranges."
    if place.provenance:
        note = f"{note} Provenance: {place.provenance}."
    return SourceRecord(
        id=f"pleiades-{place.pleiades_id}",
        citation=place.citation,
        kind=SOURCE_KIND,
        url=place.uri,
        licence=place.licence,
        note=note,
    )


def name_claims(place: PleiadesPlace) -> list[Claim]:
    """One claim per name the gazetteer records, with the span it gives.

    Ordered deterministically. The artifact is committed and reviewed as a
    diff, so identical input must produce identical output.
    """
    claims: list[Claim] = []

    for name in place.names:
        language = language_label(name.language)
        span = format_years(name.start, name.end)

        statement = f"Known as “{name.display}”"
        if language:
            statement += f" ({language})"
        if span:
            statement += f", recorded {span}"
        statement += "."

        claims.append(
            Claim(
                subject="name",
                statement=statement,
                confidence=name.confidence,
                start_year=name.start,
                end_year=name.end,
            )
        )

    # Two Pleiades records can romanise to the same display form; keep one.
    seen: set[str] = set()
    unique: list[Claim] = []
    for claim in claims:
        if claim.statement in seen:
            continue
        seen.add(claim.statement)
        unique.append(claim)

    # Earliest first, undated last, so the artifact reads as a name history.
    return sorted(
        unique,
        key=lambda c: (c.start_year is None, c.start_year or 0, c.statement),
    )


def build_artifact(slug: str, place: PleiadesPlace) -> dict[str, object]:
    """The committed artifact: one source, and the claims that cite it.

    Deliberately carries no timestamp. It is reviewed as a diff, and a
    generation time would make every run look like a change.
    """
    return {
        "place": slug,
        "gazetteer": "pleiades",
        "source": source_for(place).to_json(),
        "claims": [claim.to_json() for claim in name_claims(place)],
    }

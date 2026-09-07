"""Read a place from Pleiades, the gazetteer of ancient places.

Pleiades is CC-BY 3.0: reuse is free, attribution is *required*. Every record
this module produces carries the licence and the place URI so that obligation
travels with the data instead of being remembered later.

https://pleiades.stoa.org/
"""

from __future__ import annotations

import json
import urllib.request
from dataclasses import dataclass
from typing import Any

PLEIADES_BASE = "https://pleiades.stoa.org/places"
LICENCE = "CC-BY"
USER_AGENT = "antea-pipeline (+https://github.com/danielgmorosan/Antea)"

# Pleiades name records without an attested form are editorial romanisations
# rather than something a source actually wrote down.
ATTESTED = "attested"
INFERRED = "inferred"


@dataclass(frozen=True, slots=True)
class PlaceName:
    """One name a place was known by, and when it is attested."""

    romanized: str
    attested: str | None
    language: str | None
    name_type: str | None
    # Pleiades expresses these as years, negative for BC. Either may be absent.
    start: int | None
    end: int | None

    @property
    def confidence(self) -> str:
        """`attested` only when a source recorded the form itself."""
        return ATTESTED if self.attested else INFERRED

    @property
    def display(self) -> str:
        """The form to show: what was written, else the romanisation."""
        return self.attested or self.romanized


@dataclass(frozen=True, slots=True)
class PleiadesPlace:
    """The slice of a Pleiades record Antea uses."""

    pleiades_id: str
    title: str
    uri: str
    description: str
    provenance: str | None
    place_types: tuple[str, ...]
    lng: float | None
    lat: float | None
    names: tuple[PlaceName, ...]
    licence: str = LICENCE

    @property
    def citation(self) -> str:
        """A citation a reader can follow, in the house style."""
        return f"Pleiades, {self.title} ({self.pleiades_id})"


def place_url(pleiades_id: str) -> str:
    return f"{PLEIADES_BASE}/{pleiades_id}"


def fetch_place(pleiades_id: str, *, timeout: int = 30) -> dict[str, Any]:
    """Fetch one place record. The only function here that touches the network."""
    request = urllib.request.Request(
        f"{place_url(pleiades_id)}/json",
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def _coerce_year(value: Any) -> int | None:
    """Pleiades years arrive as ints, floats or None. Zero is a real value here."""
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def parse_place(pleiades_id: str, payload: dict[str, Any]) -> PleiadesPlace:
    """Turn a raw Pleiades record into the slice Antea uses.

    Tolerant by design: Pleiades records are community-edited and fields are
    unevenly populated, so a missing value is absent rather than fatal.
    """
    point = payload.get("reprPoint") or []
    lng, lat = (point[0], point[1]) if len(point) >= 2 else (None, None)

    names: list[PlaceName] = []
    for raw in payload.get("names") or []:
        romanized = (raw.get("romanized") or "").strip()
        attested = (raw.get("attested") or "").strip() or None
        if not romanized and not attested:
            continue
        names.append(
            PlaceName(
                romanized=romanized or (attested or ""),
                attested=attested,
                language=raw.get("language") or None,
                name_type=raw.get("nameType") or None,
                start=_coerce_year(raw.get("start")),
                end=_coerce_year(raw.get("end")),
            )
        )

    return PleiadesPlace(
        pleiades_id=pleiades_id,
        title=(payload.get("title") or "").strip(),
        uri=payload.get("uri") or place_url(pleiades_id),
        description=(payload.get("description") or "").strip(),
        provenance=(payload.get("provenance") or "").strip() or None,
        place_types=tuple(payload.get("placeTypes") or ()),
        lng=lng,
        lat=lat,
        names=tuple(names),
    )


def names_covering(place: PleiadesPlace, year: int) -> tuple[PlaceName, ...]:
    """Names attested in `year`.

    A missing bound is open-ended, matching how Pleiades models a name whose
    first or last attestation is unknown.
    """
    return tuple(
        name
        for name in place.names
        if (name.start is None or name.start <= year)
        and (name.end is None or name.end >= year)
    )

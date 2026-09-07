"""Read the city specs, which stay the editorial source of truth.

The pipeline does not own the list of places; it reads the specs the site
already renders from and enriches the ones that name a gazetteer id.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SPEC_DIR = REPO_ROOT / "packages" / "city-specs" / "src"
ARTIFACT_DIR = SPEC_DIR / "ingested"


@dataclass(frozen=True, slots=True)
class CityRef:
    slug: str
    name: str
    era_years: list[int]
    pleiades_id: str | None


def load_city_refs(spec_dir: Path = SPEC_DIR) -> list[CityRef]:
    refs: list[CityRef] = []
    for path in sorted(spec_dir.glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        slug = payload.get("slug")
        if not slug:
            continue
        refs.append(
            CityRef(
                slug=slug,
                name=payload.get("name", slug),
                era_years=[era["year"] for era in payload.get("eras", [])],
                pleiades_id=(payload.get("externalIds") or {}).get("pleiades"),
            )
        )
    return refs


def artifact_path(slug: str, gazetteer: str, directory: Path = ARTIFACT_DIR) -> Path:
    return directory / f"{slug}.{gazetteer}.json"


def write_artifact(path: Path, artifact: dict[str, object]) -> bool:
    """Write the artifact, returning whether it changed.

    Formatted to match what Prettier produces for the rest of the repo, so the
    committed file is stable across the two toolchains.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(artifact, indent=2, ensure_ascii=False) + "\n"
    if path.exists() and path.read_text(encoding="utf-8") == text:
        return False
    path.write_text(text, encoding="utf-8")
    return True

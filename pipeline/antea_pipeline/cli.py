"""Command line entry point.

antea-ingest              fetch and write artifacts for every linked city
antea-ingest --check      fail if an artifact is out of date, for CI
antea-ingest --offline    re-emit from recorded fixtures, no network
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .claims import build_artifact
from .pleiades import fetch_place, parse_place
from .specs import artifact_path, load_city_refs, write_artifact


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="antea-ingest", description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="do not write; exit non-zero if an artifact would change",
    )
    parser.add_argument(
        "--fixtures",
        type=Path,
        default=None,
        help="read recorded responses from this directory instead of the network",
    )
    args = parser.parse_args(argv)

    stale: list[str] = []
    for ref in load_city_refs():
        if not ref.pleiades_id:
            print(f"skipped   {ref.slug}: no pleiades id in its spec")
            continue

        if args.fixtures:
            payload = json.loads(
                (args.fixtures / f"pleiades_{ref.pleiades_id}.json").read_text("utf-8")
            )
        else:
            payload = fetch_place(ref.pleiades_id)

        place = parse_place(ref.pleiades_id, payload)
        artifact = build_artifact(ref.slug, place)
        path = artifact_path(ref.slug, "pleiades")

        if args.check:
            current = path.read_text("utf-8") if path.exists() else ""
            expected = json.dumps(artifact, indent=2, ensure_ascii=False) + "\n"
            if current != expected:
                stale.append(ref.slug)
                print(f"stale     {path.relative_to(Path.cwd())}")
            else:
                print(f"current   {ref.slug}")
            continue

        changed = write_artifact(path, artifact)
        claims = len(artifact["claims"])  # type: ignore[arg-type]
        print(f"{'wrote    ' if changed else 'unchanged'} {ref.slug} ({claims} claims)")

    if stale:
        print(f"\n{len(stale)} artifact(s) out of date. Run antea-ingest to refresh.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

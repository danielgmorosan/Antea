"""Ingest sourced facts about Antea's places from open gazetteers.

The pipeline never writes to a database directly. It emits a reviewable JSON
artifact that is committed to the repository, so an ingested fact goes through
the same review as an editorial one — which is the point, since these become
claims that the site will attribute to a source.
"""

__all__ = ["__version__"]

__version__ = "0.1.0"

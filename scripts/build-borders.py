#!/usr/bin/env python3
"""Regenerate apps/web/public/data/*.json from a clone of
https://github.com/aourednik/historical-basemaps (GPL-3.0).

Usage: python3 scripts/build-borders.py /path/to/historical-basemaps
"""
import json, os, sys
from shapely.geometry import shape, mapping
from shapely import simplify

YEARS = [-3000,-2000,-1500,-1000,-700,-500,-400,-323,-300,-200,-100,-1,
         100,200,300,400,500,600,700,800,900,1000,1100,1200,1300,1400,1492,1500,
         1600,1650,1700,1715,1783,1800,1815,1880,1900,1914,1920,1938,1945,1960,1994,2000]
TOLERANCE = 0.05   # degrees
DECIMALS = 3

def fname(y): return f"world_bc{-y}.geojson" if y < 0 else f"world_{y}.geojson"
def key(y): return f"bc{-y}" if y < 0 else str(y)
def rnd(c):
    if isinstance(c[0], (int, float)): return [round(c[0], DECIMALS), round(c[1], DECIMALS)]
    return [rnd(x) for x in c]

def main(src):
    out = os.path.join(os.path.dirname(__file__), "..", "apps", "web", "public", "data")
    os.makedirs(out, exist_ok=True)
    total = 0
    for y in YEARS:
        d = json.load(open(os.path.join(src, "geojson", fname(y))))
        feats = []
        for f in d["features"]:
            g = f.get("geometry")
            if not g: continue
            try:
                s = simplify(shape(g), TOLERANCE, preserve_topology=True)
                if s.is_empty: continue
                gm = mapping(s)
            except Exception:
                continue
            p = f.get("properties", {})
            props = {"p": p.get("BORDERPRECISION", 1)}
            if p.get("NAME"): props["n"] = p["NAME"]
            sub = p.get("SUBJECTO")
            if sub and sub != p.get("NAME"): props["s"] = sub
            gm["coordinates"] = rnd(gm["coordinates"])
            feats.append({"type": "Feature", "properties": props, "geometry": gm})
        fp = os.path.join(out, key(y) + ".json")
        json.dump({"type": "FeatureCollection", "features": feats}, open(fp, "w"), separators=(",", ":"))
        total += os.path.getsize(fp)
        print(f"{y:>6}: {len(feats):4d} features, {os.path.getsize(fp)//1024:4d} KB")
    print(f"TOTAL {total/1024/1024:.1f} MB")

if __name__ == "__main__":
    if len(sys.argv) != 2: sys.exit(__doc__)
    main(sys.argv[1])

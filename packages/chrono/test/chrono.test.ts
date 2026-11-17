import { describe, expect, it } from "vitest";
import {
  YEARS, fileKey, yearLabel, clampIndex, nameAt, phaseAt,
  activeTimelineYear, isVisible, colorFor, ringMetrics, physicalWeight,
  labelFontSize, SOFT_LABEL, parseYearKey, snapYears, nearestIndex,
  type Phase,
} from "../src/index";

const CONSTANTINOPLE = [
  [-657, "Byzantion"], [330, "Constantinople"],
  [1453, "Kostantiniyye"], [1930, "Istanbul"],
] as const;

const PHASES: Phase[] = [
  [-657, 330, "Greek, then Rome", ""],
  [330, 395, "Roman Empire", ""],
  [395, 1204, "Byzantine Empire", ""],
  [1204, 1261, "Latin Empire", ""],
  [1261, 1453, "Byzantine (restored)", ""],
  [1453, 1923, "Ottoman Empire", ""],
  [1923, 2100, "Turkey", ""],
];

describe("years", () => {
  it("is sorted ascending with no duplicates", () => {
    const s = [...YEARS].sort((a, b) => a - b);
    expect([...YEARS]).toEqual(s);
    expect(new Set(YEARS).size).toBe(YEARS.length);
  });
  it("maps to data file keys", () => {
    expect(fileKey(-500)).toBe("bc500");
    expect(fileKey(-1)).toBe("bc1");
    expect(fileKey(1200)).toBe("1200");
  });
  it("labels eras", () => {
    expect(yearLabel(-323)).toBe("323 BC");
    expect(yearLabel(1492)).toBe("1492 AD");
  });
  it("clamps slider indices", () => {
    expect(clampIndex(-3)).toBe(0);
    expect(clampIndex(999)).toBe(YEARS.length - 1);
  });
});

describe("city identity through time", () => {
  it("switches names at the right boundaries", () => {
    expect(nameAt(CONSTANTINOPLE, -700)).toBe("Byzantion");
    expect(nameAt(CONSTANTINOPLE, 329)).toBe("Byzantion");
    expect(nameAt(CONSTANTINOPLE, 330)).toBe("Constantinople");
    expect(nameAt(CONSTANTINOPLE, 1452)).toBe("Constantinople");
    expect(nameAt(CONSTANTINOPLE, 1453)).toBe("Kostantiniyye");
    expect(nameAt(CONSTANTINOPLE, 1994)).toBe("Istanbul");
  });
  it("finds the ruling phase, half-open intervals", () => {
    expect(phaseAt(PHASES, -700)).toBeNull();
    expect(phaseAt(PHASES, -100)?.[2]).toBe("Greek, then Rome");
    expect(phaseAt(PHASES, 394)?.[2]).toBe("Roman Empire");
    expect(phaseAt(PHASES, 1204)?.[2]).toBe("Latin Empire");
    expect(phaseAt(PHASES, 1453)?.[2]).toBe("Ottoman Empire");
    expect(phaseAt(PHASES, 2000)?.[2]).toBe("Turkey");
  });
  it("highlights the latest timeline entry ≤ year", () => {
    const tl = [[-657, "a"], [330, "b"], [1453, "c"]] as const;
    expect(activeTimelineYear(tl, -700)).toBeNull();
    expect(activeTimelineYear(tl, 400)).toBe(330);
    expect(activeTimelineYear(tl, 1453)).toBe(1453);
  });
  it("controls marker visibility", () => {
    expect(isVisible(1325, 1521, 1400)).toBe(true);  // Tenochtitlan exists
    expect(isVisible(1325, 1521, 1600)).toBe(false); // ...and is gone
  });
});

describe("url year keys", () => {
  it("round-trips every snapshot year", () => {
    for (const y of YEARS) expect(parseYearKey(fileKey(y))).toBe(y);
  });
  it("rejects garbage and non-snapshot years", () => {
    expect(parseYearKey("bc501")).toBeNull();
    expect(parseYearKey("1201")).toBeNull();
    expect(parseYearKey("abc")).toBeNull();
    expect(parseYearKey("-500")).toBeNull();
    expect(parseYearKey("")).toBeNull();
  });
  it("lists the snapshot years a place exists in", () => {
    const ys = snapYears(1325, 1521); // Tenochtitlan
    expect(ys[0]).toBe(1400);
    expect(ys[ys.length - 1]).toBe(1500);
    expect(ys).not.toContain(1600);
  });
  it("snaps arbitrary years to the nearest snapshot", () => {
    expect(YEARS[nearestIndex(1453)]).toBe(1492);
    expect(YEARS[nearestIndex(-650)]).toBe(-700);
    expect(YEARS[nearestIndex(5000)]).toBe(2000);
  });
});

describe("colors & labels", () => {
  it("is deterministic and valid hsl", () => {
    const p = { sat: 40, lum: 72 };
    expect(colorFor("Song Empire", p)).toBe(colorFor("Song Empire", p));
    expect(colorFor("Song Empire", p)).toMatch(/^hsl\(\d+ 40% \d+%\)$/);
  });
  it("computes area and centroid of a unit square ring", () => {
    const sq = [[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]] as const;
    const m = ringMetrics(sq);
    expect(m.area).toBeCloseTo(4);
    expect(m.c[0]).toBeCloseTo(1);
    expect(m.c[1]).toBeCloseTo(1);
  });
  it("down-weights polar areas", () => {
    expect(physicalWeight(100, 0)).toBeGreaterThan(physicalWeight(100, 70));
  });
  it("styles peoples differently from states", () => {
    expect(SOFT_LABEL.test("Tuareg Nomadic Tribes")).toBe(true);
    expect(SOFT_LABEL.test("Song Empire")).toBe(false);
    expect(labelFontSize(600, "Australian aboriginal hunter-gatherers", true))
      .toBeLessThan(labelFontSize(600, "Mongol Empire", false));
  });
});

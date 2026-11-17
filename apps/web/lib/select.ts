export type Selection =
  | { kind: "city"; slug: string }
  | { kind: "polity"; n: string; s: string | null; p: number }
  | { kind: "terra" };

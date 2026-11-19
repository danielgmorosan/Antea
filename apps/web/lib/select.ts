/** Client-safe subset of an AutoPlace, passed from the server page. */
export interface AutoPlaceLite {
  slug: string;
  q: string;
  name: string;
  desc: string;
  kinds?: string[];
  inception?: number;
  dissolved?: number;
  enwiki?: string;
}

export type Selection =
  | { kind: "city"; slug: string }
  | { kind: "auto"; place: AutoPlaceLite }
  | { kind: "polity"; n: string; s: string | null; p: number }
  | { kind: "terra" };

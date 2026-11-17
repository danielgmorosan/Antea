export interface MapPalette {
  ocean: string;
  terra: string;
  terraLine: string;
  line: string;
  grat: string;
  sat: number;
  lum: number;
}

export const PAL: Record<"light" | "dark", MapPalette> = {
  light: {
    ocean: "#bfd2ce", terra: "#dcd4bf", terraLine: "rgba(34,48,47,.10)",
    line: "rgba(34,48,47,.42)", grat: "rgba(34,48,47,.07)", sat: 40, lum: 72,
  },
  dark: {
    ocean: "#0e1d1b", terra: "#242c28", terraLine: "rgba(227,230,223,.07)",
    line: "rgba(227,230,223,.32)", grat: "rgba(227,230,223,.05)", sat: 28, lum: 32,
  },
};

export function isDark(): boolean {
  const t = document.documentElement.getAttribute("data-theme");
  if (t === "dark") return true;
  if (t === "light") return false;
  return matchMedia("(prefers-color-scheme: dark)").matches;
}

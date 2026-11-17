import { notFound, redirect } from "next/navigation";
import { POLITIES, peakYearKey } from "@/lib/polities";

export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return Object.keys(POLITIES).map((slug) => ({ slug }));
}

/** A polity's canonical page is its territorial peak as mapped. */
export default async function PolityPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const entry = POLITIES[slug];
  if (!entry) notFound();
  redirect(`/polity/${slug}/${peakYearKey(entry)}`);
}

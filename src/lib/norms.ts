/** Norm citations → links to the official statute texts (gesetze-im-internet.de) and extraction from text. */
const LAWS: Record<string, { slug: string; art?: boolean }> = {
  BGB: { slug: "bgb" }, GG: { slug: "gg", art: true }, HGB: { slug: "hgb" }, StGB: { slug: "stgb" }, ZPO: { slug: "zpo" },
  BVerfGG: { slug: "bverfgg" }, BWahlG: { slug: "bwahlg" }, PartG: { slug: "partg" }, VwGO: { slug: "vwgo" }, VwVfG: { slug: "vwvfg" },
  EGBGB: { slug: "bgbeg", art: true }, UWG: { slug: "uwg_2004" }, ProstG: { slug: "prostg" }, InsO: { slug: "inso" },
};

export function normUrl(citation: string): string | null {
  const m = citation.match(/^(§§?|Art\.)\s*(\d+[a-z]?)\b.*?\b(BGB|GG|HGB|StGB|ZPO|BVerfGG|BWahlG|PartG|VwGO|VwVfG|EGBGB|UWG|ProstG|InsO)\b/);
  if (!m) return null;
  const law = LAWS[m[3]];
  if (!law) return null;
  return law.art || m[1] === "Art." ? `https://www.gesetze-im-internet.de/${law.slug}/art_${m[2]}.html` : `https://www.gesetze-im-internet.de/${law.slug}/__${m[2]}.html`;
}

/** Finds norm citations like "§ 130 Abs. 1 S. 1 BGB" or "Art. 38 Abs. 1 S. 2 GG" in a text (fallback when a section lists none). */
export function extractNorms(text: string, max = 8): string[] {
  const re = /(?:§|Art\.)\s*\d+[a-z]?(?:\s*(?:Abs\.|I{1,3}V?|IV|V)\s*\d*)?(?:\s*(?:S\.|Satz)\s*\d+)?(?:\s*Nr\.\s*\d+[a-z]?)?\s*(?:BGB|GG|HGB|StGB|ZPO|BVerfGG|BWahlG|PartG|VwGO|VwVfG|EGBGB|UWG|InsO)\b/g;
  const out: string[] = [];
  for (const m of text.matchAll(re)) {
    const n = m[0].replace(/\s+/g, " ").trim();
    if (!out.includes(n)) out.push(n);
    if (out.length >= max) break;
  }
  return out;
}

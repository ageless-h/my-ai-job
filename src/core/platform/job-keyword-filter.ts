// Match each occurrence separately so a denial in one field or clause cannot
// hide an affirmative occurrence elsewhere (e.g. a structured job tag).
const NEGATED_PREFIX = /(?:并非|非|不是|并不属于|不属于|不涉及|不含|不招|不做|拒绝|杜绝|没有|无|无需|不需要|不接受|不提供|不安排|不用|不|\bnot\s+(?:an?\s+)?|\bno\s+|\bwithout\s+)[ \t“「『"']*$/iu;

function containsAffirmative(text: string, keyword: string): boolean {
  let start = 0;
  while (start < text.length) {
    const at = text.indexOf(keyword, start);
    if (at === -1) return false;
    if (!NEGATED_PREFIX.test(text.slice(Math.max(start, at - 24), at))) return true;
    start = at + keyword.length;
  }
  return false;
}

export function findExcludedJobKeyword(
  keywords: readonly string[],
  job: Record<string, unknown>,
  description: unknown
): string | undefined {
  const fields = [job.jobName, job.brandName, job.brandIndustry, job.skills, job.jobLabels, job.welfareList, description]
    .flat().filter((value): value is string => typeof value === 'string').map(value => value.toLowerCase());
  return keywords.find(raw => {
    const word = raw.trim().toLowerCase();
    return word.length > 0 && fields.some(text => containsAffirmative(text, word));
  });
}

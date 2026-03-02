// -*- coding: utf-8 -*-

const normalizeLine = (line: string): string => line.replace(/\s+/g, " ").trim();

const sanitizeMultiline = (text: string): string => {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => normalizeLine(line));

  const compact: string[] = [];
  let prevBlank = false;
  for (const line of lines) {
    if (!line) {
      if (!prevBlank) {
        compact.push("");
      }
      prevBlank = true;
      continue;
    }
    compact.push(line);
    prevBlank = false;
  }
  return compact.join("\n").trim();
};

const trimByLength = (text: string, maxLength: number): string => {
  if (!text) {
    return "";
  }
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const queryFirstText = (doc: Document, selectors: string[]): string => {
  for (const selector of selectors) {
    const node = doc.querySelector(selector);
    if (!node) {
      continue;
    }
    const text = sanitizeMultiline((node as HTMLElement).innerText || node.textContent || "");
    if (text) {
      return text;
    }
  }
  return "";
};

const RESUME_PRIMARY_SELECTORS = [
  ".resume-box.resume-center",
  ".resume-content-box",
  ".resume-content",
  "#userinfo",
  "#summary",
  "#purpose",
  "#history",
  "#project",
  "#education",
  "#social",
  "#skill",
  "#certificate"
];

const collectResumePrimaryTexts = (doc: Document): string[] => {
  const results: string[] = [];
  const seen = new Set<string>();

  for (const selector of RESUME_PRIMARY_SELECTORS) {
    const nodes = Array.from(doc.querySelectorAll(selector));
    for (const node of nodes) {
      const text = sanitizeMultiline((node as HTMLElement).innerText || node.textContent || "");
      if (!text || text.length < 30) {
        continue;
      }
      if (seen.has(text)) {
        continue;
      }
      seen.add(text);
      results.push(text);
    }
  }

  return results;
};

const collectCandidateTexts = (doc: Document): string[] => {
  const selectors = [
    ".resume-wrap",
    ".resume-main",
    ".resume-content",
    ".geek-resume-content",
    ".geek-resume-wrap",
    "main",
    "article"
  ];

  const candidates: string[] = [];
  for (const selector of selectors) {
    const nodes = Array.from(doc.querySelectorAll(selector));
    for (const node of nodes) {
      const text = sanitizeMultiline((node as HTMLElement).innerText || node.textContent || "");
      if (text) {
        candidates.push(text);
      }
    }
  }

  if (!candidates.length) {
    const bodyText = sanitizeMultiline((doc.body as HTMLElement | null)?.innerText || doc.body?.textContent || "");
    if (bodyText) {
      candidates.push(bodyText);
    }
  }

  return candidates;
};

export const extractResumeTextFromHtml = (html: string, maxLength = 12_000): string => {
  if (!html || !html.trim()) {
    return "";
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  doc.querySelectorAll("script,style,noscript").forEach((node) => node.remove());

  const primaryText = collectResumePrimaryTexts(doc).join("\n\n").trim();
  if (primaryText.length >= 60) {
    return trimByLength(primaryText, maxLength);
  }

  const candidates = collectCandidateTexts(doc)
    .map((text) => text.replace(/\n{3,}/g, "\n\n").trim())
    .filter((text) => text.length >= 60);

  if (!candidates.length) {
    return "";
  }

  candidates.sort((a, b) => b.length - a.length);
  return trimByLength(candidates[0], maxLength);
};

export const extractResumeTextFromDocument = (doc: Document, maxLength = 12_000): string => {
  const primaryText = collectResumePrimaryTexts(doc).join("\n\n").trim();
  if (primaryText.length >= 60) {
    return trimByLength(primaryText, maxLength);
  }

  const candidates = collectCandidateTexts(doc)
    .map((text) => text.replace(/\n{3,}/g, "\n\n").trim())
    .filter((text) => text.length >= 60);

  if (!candidates.length) {
    return "";
  }

  candidates.sort((a, b) => b.length - a.length);
  return trimByLength(candidates[0], maxLength);
};

export const extractBossResumeProfileFromHtml = (html: string): Record<string, string> => {
  if (!html || !html.trim()) {
    return {
      fullName: "",
      infoLabels: "",
      profileSummary: "",
      expectedJob: "",
      workYears: "",
      education: "",
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,noscript").forEach((node) => node.remove());
  return extractBossResumeProfileFromDocument(doc);
};

export const extractBossResumeProfileFromDocument = (doc: Document): Record<string, string> => {
  const fullName = queryFirstText(doc, ["#userinfo .name", ".user-info .name", "p.name"]);
  const infoLabels = queryFirstText(doc, ["#userinfo .info-labels", ".info-labels"]);
  const profileSummary = queryFirstText(doc, ["#summary .info-text", ".advantage-text", "#summary"]);
  const expectedJob = queryFirstText(doc, ["#purpose .expect-list-item", "#purpose .primary-info", "#purpose"]);

  const workYearsMatch = infoLabels.match(/\d+\+?年经验/);
  const educationMatch = infoLabels.match(/博士|硕士|本科|大专|中专|高中|初中/);

  return {
    fullName,
    infoLabels,
    profileSummary,
    expectedJob,
    workYears: workYearsMatch?.[0] || "",
    education: educationMatch?.[0] || "",
  };
};

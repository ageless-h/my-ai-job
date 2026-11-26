// Resume payloads stored by current and earlier account/profile panels.
export function stripResumeFields(record: object): void {
  const fields = record as Record<string, unknown>;
  for (const key of ['deliveryResume', 'deliveryProjects', 'importedResume', 'parsedResume',
    'attachmentResume', 'resumeId', 'resumeText', 'resumeTextSource', 'resume', 'resumeInfo',
    'resumeProfile', 'customImageSet', 'cI', 'customImageEnabled', 'cIE']) delete fields[key];
}

export function stripAccountResume(profile: object): void {
  stripResumeFields(profile);
  const pref = (profile as Record<string, unknown>).preference;
  if (pref && typeof pref === 'object') stripResumeFields(pref);
}

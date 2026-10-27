const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

export function countryLabel(code: string): string {
  if (code === 'unknown') return 'Unknown';
  if (code === 'other') return 'Other';
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export type MuscleInput = string | string[] | null | undefined;

const cleanMuscle = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/^["']|["']$/g, '');
  return cleaned.length > 0 ? cleaned : null;
};

const parseJsonArray = (value: string): string[] | null => {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    return parsed.map(cleanMuscle).filter((m): m is string => m !== null);
  } catch {
    return null;
  }
};

const parsePostgresArray = (value: string): string[] | null => {
  if (!value.startsWith('{') || !value.endsWith('}')) return null;
  return value
    .slice(1, -1)
    .split(',')
    .map(cleanMuscle)
    .filter((m): m is string => m !== null);
};

export function normalizeMuscleList(value: MuscleInput): string[] {
  if (Array.isArray(value)) {
    return value.map(cleanMuscle).filter((m): m is string => m !== null);
  }

  const cleaned = cleanMuscle(value);
  if (!cleaned) return [];

  const parsedJson = parseJsonArray(cleaned);
  if (parsedJson) return parsedJson;

  const parsedPostgres = parsePostgresArray(cleaned);
  if (parsedPostgres) return parsedPostgres;

  if (cleaned.includes(',')) {
    return cleaned
      .split(',')
      .map(cleanMuscle)
      .filter((m): m is string => m !== null);
  }

  return [cleaned];
}

export function primaryMuscleLabel(value: MuscleInput): string | null {
  return normalizeMuscleList(value)[0] ?? null;
}

export function formatMuscleList(value: MuscleInput): string | null {
  const muscles = normalizeMuscleList(value);
  return muscles.length > 0 ? muscles.join(', ') : null;
}

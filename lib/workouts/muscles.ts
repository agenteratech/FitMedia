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

// High-level muscle groups for analytics/insights, keyed by substring match.
const MUSCLE_GROUPS: { label: string; keywords: string[] }[] = [
  { label: 'Chest', keywords: ['chest', 'pectoral', 'pec'] },
  { label: 'Back', keywords: ['back', 'lat', 'rhomboid', 'trapezius', 'trap', 'teres'] },
  { label: 'Shoulders', keywords: ['shoulder', 'deltoid', 'delt', 'rotator'] },
  { label: 'Arms', keywords: ['bicep', 'tricep', 'forearm', 'wrist', 'grip', 'brachi'] },
  { label: 'Legs', keywords: ['leg', 'quad', 'hamstring', 'glute', 'calf', 'calves', 'hip', 'adductor', 'abductor', 'thigh'] },
  { label: 'Core', keywords: ['core', 'abs', 'abdominal', 'oblique', 'transverse'] },
];

/**
 * Maps a stored muscle target (e.g. "lats", "quadriceps") to a high-level
 * display group (Back, Legs, …). Falls back to a capitalized form of the raw
 * value, or null when there is nothing usable.
 */
export function muscleGroupLabel(value: MuscleInput): string | null {
  const primary = primaryMuscleLabel(value);
  if (!primary) return null;
  const lower = primary.toLowerCase();
  const group = MUSCLE_GROUPS.find((g) => g.keywords.some((kw) => lower.includes(kw)));
  if (group) return group.label;
  return primary.charAt(0).toUpperCase() + primary.slice(1);
}

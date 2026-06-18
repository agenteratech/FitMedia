const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export type ExtractedFood = {
  food: string;
  quantity: number;
  unit: string;
};

const EXTRACTION_PROMPT = `You are a nutrition assistant. Listen to this voice recording and extract every food item mentioned.

Return ONLY a valid JSON array. Each element must have exactly these fields:
- "food": the food name in English, properly capitalized (e.g. "Chicken Breast", "White Rice", "Olive Oil")
- "quantity": a numeric amount (number, not string)
- "unit": one of these exact values: "g", "ml", "piece", "slice", "cup", "tbsp", "tsp", "oz", "scoop", "serving"

Conversion rules:
- "grams" → "g", "milliliters"/"ml" → "ml", "tablespoon"/"tablespoons" → "tbsp", "teaspoon"/"teaspoons" → "tsp", "ounces" → "oz"
- "a glass of milk" → quantity:240, unit:"ml"
- "an egg" / "1 egg" → quantity:1, unit:"piece"
- "a slice of bread" → quantity:1, unit:"slice"
- "a scoop of protein" → quantity:1, unit:"scoop"
- If quantity not stated: use a sensible default (1 piece, 100g, etc.)
- Ignore meal type mentions (breakfast/lunch/dinner/snack)
- If audio is unclear or no food is mentioned: return []

Return ONLY the JSON array, no explanation, no markdown code blocks.`;

export async function extractFoodsFromAudio(
  audioBase64: string,
  mimeType = 'audio/mp4',
): Promise<ExtractedFood[]> {
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: EXTRACTION_PROMPT },
            { inline_data: { mime_type: mimeType, data: audioBase64 } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    let msg = `Gemini API error (${response.status})`;
    try {
      const errJson = JSON.parse(errText);
      msg = errJson?.error?.message ?? msg;
    } catch {}
    throw new Error(msg);
  }

  const data = await response.json();
  const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // Strip markdown fences if model wraps output
  const cleaned = rawText
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: unknown): item is ExtractedFood =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as ExtractedFood).food === 'string' &&
        typeof (item as ExtractedFood).quantity === 'number' &&
        typeof (item as ExtractedFood).unit === 'string',
    );
  } catch {
    return [];
  }
}

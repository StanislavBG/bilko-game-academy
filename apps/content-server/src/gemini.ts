const GEMINI_MODEL = 'gemini-2.5-flash-image';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface RegenInput {
  prompt: string;
  useSource?: boolean;
  sourcePngB64?: string;
}

export interface RegenResult {
  ok: boolean;
  pngB64?: string;
  error?: string;
}

interface GeminiPart {
  text?: string;
  inlineData?: { data?: string; mimeType?: string };
  inline_data?: { data?: string; mime_type?: string };
}

export async function regenSprite(input: RegenInput): Promise<RegenResult> {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) return { ok: false, error: 'GEMINI_API_KEY not set' };

  const parts: GeminiPart[] = [{ text: input.prompt }];
  if (input.useSource && input.sourcePngB64) {
    parts.push({ inlineData: { mimeType: 'image/png', data: input.sourcePngB64 } });
  }

  const body = {
    contents: [{ parts }],
    generationConfig: { responseModalities: ['IMAGE'] },
  };

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { ok: false, error: `HTTP ${res.status}: ${txt.slice(0, 300)}` };
    }
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
    };
    const respParts = json.candidates?.[0]?.content?.parts ?? [];
    const imagePart = respParts.find((p) => p.inlineData?.data || p.inline_data?.data);
    if (!imagePart) return { ok: false, error: 'no image in Gemini response' };
    const b64 = imagePart.inlineData?.data ?? imagePart.inline_data?.data;
    if (!b64) return { ok: false, error: 'empty image data' };
    return { ok: true, pngB64: b64 };
  } catch (err) {
    return { ok: false, error: (err as Error)?.message ?? String(err) };
  }
}

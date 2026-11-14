const MAX_TEXT_LENGTH = 10_000;
const MAX_SKILLS_COUNT = 30;
const MAX_SKILL_LENGTH = 100;

const ALLOWED_ORIGINS = new Set([
  'https://johnbendfeldt.com',
  'https://www.johnbendfeldt.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:8888',
]);

function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'https:') {
      return false;
    }

    const deployUrls = [
      process.env.URL,
      process.env.DEPLOY_PRIME_URL,
      process.env.DEPLOY_URL,
    ];
    for (const candidate of deployUrls) {
      if (!candidate) continue;
      try {
        const candidateUrl = new URL(candidate);
        if (candidateUrl.protocol === 'https:' && candidateUrl.origin === parsed.origin) {
          return true;
        }
      } catch {
        // Ignore malformed environment URL
      }
    }

    const siteName = (process.env.ALLOWED_NETLIFY_SITE || process.env.SITE_NAME || '')
      .trim()
      .toLowerCase();
    if (/^[a-z0-9-]+$/.test(siteName)) {
      if (parsed.hostname === `${siteName}.netlify.app`) {
        return true;
      }
      const previewSuffix = `--${siteName}.netlify.app`;
      if (parsed.hostname.endsWith(previewSuffix)) {
        const previewPrefix = parsed.hostname.slice(0, -previewSuffix.length);
        if (/^[a-z0-9-]+$/.test(previewPrefix)) {
          return true;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

function buildResponseHeaders(origin?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };
  if (origin && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }
  return headers;
}

export const handler = async (event: {
  httpMethod: string;
  body: string | null;
  headers?: Record<string, string | undefined>;
}) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const headers = buildResponseHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    if (origin && !isAllowedOrigin(origin)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden origin' }) };
    }
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  if (origin && !isAllowedOrigin(origin)) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Origin is not permitted' }),
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: 'AI extraction service is not configured.' }),
    };
  }

  if (event.body && event.body.length > MAX_TEXT_LENGTH * 2) {
    return {
      statusCode: 413,
      headers,
      body: JSON.stringify({ error: `Request payload exceeds maximum allowed size.` }),
    };
  }

  try {
    const { text } = JSON.parse(event.body || '{}');
    if (!text || typeof text !== 'string') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ skills: [] }),
      };
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Input text exceeds maximum length of ${MAX_TEXT_LENGTH.toLocaleString()} characters.` }),
      };
    }

    const prompt = `Extract all key technical skills, architectural concepts, languages, frameworks, and engineering tools from this text. Return a JSON object with a 'skills' string array.\nText:\n${text}`;
    const models = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const geminiRes = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  skills: {
                    type: 'ARRAY',
                    items: { type: 'STRING' },
                  },
                },
                required: ['skills'],
              },
            },
          }),
        });

        if (!geminiRes.ok) {
          continue;
        }

        const data: unknown = await geminiRes.json();
        const candidateText = (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
          ?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidateText) continue;

        const parsed = JSON.parse(candidateText);
        if (parsed.skills && Array.isArray(parsed.skills)) {
          const sanitizedSkills = parsed.skills
            .filter((s: unknown): s is string => typeof s === 'string')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0 && s.length <= MAX_SKILL_LENGTH)
            .slice(0, MAX_SKILLS_COUNT);

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              skills: sanitizedSkills,
              source: 'gemini',
              model,
            }),
          };
        }
      } catch {
        // try next model
      }
    }

    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: 'All Gemini model endpoints failed' }),
    };
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON request payload' }),
    };
  }
};

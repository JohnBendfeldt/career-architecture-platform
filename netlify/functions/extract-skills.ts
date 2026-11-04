export const handler = async (event: { httpMethod: string; body: string | null }) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'GEMINI_API_KEY environment variable is not configured on Netlify.' })
    };
  }

  try {
    const { text } = JSON.parse(event.body || '{}');
    if (!text || typeof text !== 'string') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ skills: [] })
      };
    }

    const prompt = `Extract all key technical skills, architectural concepts, languages, frameworks, and engineering tools from this text. Return a JSON object with a 'skills' string array.\nText:\n${text}`;
    const models = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const geminiRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  skills: {
                    type: 'ARRAY',
                    items: { type: 'STRING' }
                  }
                },
                required: ['skills']
              }
            }
          })
        });

        if (!geminiRes.ok) {
          continue;
        }

        const data: any = await geminiRes.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidateText) continue;

        const parsed = JSON.parse(candidateText);
        if (parsed.skills && Array.isArray(parsed.skills)) {
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              skills: parsed.skills,
              source: 'gemini',
              model: model
            })
          };
        }
      } catch {
        // try next model
      }
    }

    return {
      statusCode: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'All Gemini model endpoints failed' })
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: err.message || 'Internal Server Error' })
    };
  }
};

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

const fnFilePath = path.resolve(import.meta.dirname, '../../netlify/functions/extract-skills.ts');
type HandlerFn = typeof import('../../netlify/functions/extract-skills').handler;
let handler: HandlerFn;

describe.skipIf(!fs.existsSync(fnFilePath))('Netlify Serverless Function: extract-skills', () => {
  const originalEnv = process.env.GEMINI_API_KEY;

  beforeAll(async () => {
    const mod = await import('../../netlify/functions/extract-skills');
    handler = mod.handler;
  });

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-secret-gemini-key-123';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalEnv;
    }
  });

  it('handles OPTIONS preflight for allowed origins including HTTPS netlify previews', async () => {
    const prodPreflight = await handler({
      httpMethod: 'OPTIONS',
      body: null,
      headers: { origin: 'https://johnbendfeldt.com' },
    });
    expect(prodPreflight.statusCode).toBe(204);
    expect(prodPreflight.headers['Access-Control-Allow-Origin']).toBe('https://johnbendfeldt.com');
    expect(prodPreflight.headers['X-Content-Type-Options']).toBe('nosniff');

    const previewPreflight = await handler({
      httpMethod: 'OPTIONS',
      body: null,
      headers: { Origin: 'https://deploy-preview-42--capbjb.netlify.app' },
    });
    expect(previewPreflight.statusCode).toBe(204);
    expect(previewPreflight.headers['Access-Control-Allow-Origin']).toBe(
      'https://deploy-preview-42--capbjb.netlify.app'
    );
  });

  it('rejects OPTIONS preflight and POST requests from disallowed or insecure origins', async () => {
    const evilOptions = await handler({
      httpMethod: 'OPTIONS',
      body: null,
      headers: { origin: 'https://evil.example.com' },
    });
    expect(evilOptions.statusCode).toBe(403);
    expect(evilOptions.headers['Access-Control-Allow-Origin']).toBeUndefined();

    const insecureNetlify = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ text: 'C# .NET 10' }),
      headers: { origin: 'http://insecure.netlify.app' },
    });
    expect(insecureNetlify.statusCode).toBe(403);
    expect(insecureNetlify.headers['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('returns 405 Method Not Allowed for non-POST/OPTIONS methods', async () => {
    const getRes = await handler({
      httpMethod: 'GET',
      body: null,
      headers: { origin: 'http://localhost:5173' },
    });
    expect(getRes.statusCode).toBe(405);
    expect(JSON.parse(getRes.body).error).toMatch(/Method Not Allowed/i);
  });

  it('returns 503 when GEMINI_API_KEY is not configured', async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ text: 'Senior C# Engineer' }),
      headers: { origin: 'http://localhost:5173' },
    });
    expect(res.statusCode).toBe(503);
  });

  it('enforces payload size, valid JSON, and 10,000-character text limits', async () => {
    const hugeBody = await handler({
      httpMethod: 'POST',
      body: 'x'.repeat(20_005),
      headers: { origin: 'http://localhost:5173' },
    });
    expect(hugeBody.statusCode).toBe(413);

    const malformedJson = await handler({
      httpMethod: 'POST',
      body: '{not-valid-json',
      headers: { origin: 'http://localhost:5173' },
    });
    expect(malformedJson.statusCode).toBe(400);

    const emptyText = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ text: '' }),
      headers: { origin: 'http://localhost:5173' },
    });
    expect(emptyText.statusCode).toBe(200);
    expect(JSON.parse(emptyText.body)).toEqual({ skills: [] });

    const tooLongText = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ text: 'A'.repeat(10_001) }),
      headers: { origin: 'http://localhost:5173' },
    });
    expect(tooLongText.statusCode).toBe(400);
  });

  it('sends API key strictly via x-goog-api-key header, falls back across models, and sanitizes skills', async () => {
    const rawSkills = [
      '  C# .NET 10  ',
      'React 19',
      '',
      'X'.repeat(101), // exceeds MAX_SKILL_LENGTH (100)
      42, // non-string
      ...Array.from({ length: 35 }, (_, idx) => `Skill-${idx + 1}`),
    ];

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('Model overloaded', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify({ skills: rawSkills }) }],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

    const res = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ text: 'Looking for C# .NET 10 and React 19 experience' }),
      headers: { origin: 'https://johnbendfeldt.com' },
    });

    expect(res.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    for (const [calledUrl, calledInit] of fetchMock.mock.calls) {
      expect(String(calledUrl)).not.toContain('test-secret-gemini-key-123');
      expect(String(calledUrl)).not.toContain('key=');
      const reqHeaders = calledInit?.headers as Record<string, string>;
      expect(reqHeaders['x-goog-api-key']).toBe('test-secret-gemini-key-123');
    }

    const parsed = JSON.parse(res.body);
    expect(parsed.source).toBe('gemini');
    expect(parsed.model).toBe('gemini-3.8-flash');
    expect(parsed.skills.length).toBe(30); // capped at MAX_SKILLS_COUNT
    expect(parsed.skills[0]).toBe('C# .NET 10');
    expect(parsed.skills[1]).toBe('React 19');
    expect(parsed.skills.every((s: unknown) => typeof s === 'string' && s.length <= 100)).toBe(true);
  });

  it('returns 502 Bad Gateway when all upstream Gemini models fail', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Upstream unavailable', { status: 500 })
    );

    const res = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ text: 'C# developer' }),
      headers: { origin: 'http://localhost:5173' },
    });

    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body).error).toMatch(/All Gemini model endpoints failed/i);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isSafeHttpsUrl,
  isSafeImageUrl,
  sanitizeExternalUrl,
  stripUnsafeKeys,
  safeParseStorageObject,
  safeParseStorageArray,
} from '../utils/security';
import { ApiService } from '../services/api';
import { sanitizeCsvCell } from '../utils/advancementImportExport';
import { buildZipStore, colLettersToZeroIndex, readXlsxRows } from '../utils/xlsxCodec';

describe('Security Utilities & Storage Hardening', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  describe('URL Protocol Validation', () => {
    it('accepts valid HTTPS URLs and rejects javascript:, data:, http:, and protocol-relative URLs', () => {
      expect(isSafeHttpsUrl('https://github.com/JohnBendfeldt')).toBe(true);
      expect(isSafeHttpsUrl('https://basiclanguage.school/path?q=1')).toBe(true);

      expect(isSafeHttpsUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeHttpsUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isSafeHttpsUrl('vbscript:msgbox(1)')).toBe(false);
      expect(isSafeHttpsUrl('http://insecure.example.com')).toBe(false);
      expect(isSafeHttpsUrl('//attacker.example.com')).toBe(false);
      expect(isSafeHttpsUrl('')).toBe(false);
    });

    it('accepts root-relative image paths and HTTPS avatars while blocking dangerous schemes', () => {
      expect(isSafeImageUrl('/john-bendfeldt.jpg')).toBe(true);
      expect(isSafeImageUrl('https://avatars.githubusercontent.com/u/12345')).toBe(true);

      expect(isSafeImageUrl('//evil.example.com/x.png')).toBe(false);
      expect(isSafeImageUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeImageUrl('data:image/svg+xml,<svg onload=alert(1)>')).toBe(false);
    });

    it('normalizes bare domains and http:// links to https:// while returning fallback on unsafe schemes', () => {
      expect(sanitizeExternalUrl('github.com/JohnBendfeldt', 'https://github.com')).toBe(
        'https://github.com/JohnBendfeldt'
      );
      expect(sanitizeExternalUrl('http://linkedin.com/in/johnbendfeldt', 'https://linkedin.com')).toBe(
        'https://linkedin.com/in/johnbendfeldt'
      );
      expect(sanitizeExternalUrl('javascript:alert(document.cookie)', 'https://github.com')).toBe(
        'https://github.com'
      );
      expect(sanitizeExternalUrl('http:javascript:alert(1)', '#')).toBe('#');
    });
  });

  describe('Prototype-Pollution & Storage Schema Guards', () => {
    it('strips __proto__, constructor, and prototype keys recursively from parsed JSON', () => {
      const maliciousJson =
        '{"id":"u1","email":"dev@example.com","__proto__":{"isAdmin":true},"nested":{"constructor":{"polluted":true},"ok":1}}';
      const parsed = safeParseStorageObject<Record<string, unknown>>(maliciousJson);

      expect(parsed).not.toBeNull();
      expect(parsed?.id).toBe('u1');
      expect(Object.prototype.hasOwnProperty.call(parsed, '__proto__')).toBe(false);
      expect(({} as Record<string, unknown>).isAdmin).toBeUndefined();
      const nested = parsed?.nested as Record<string, unknown>;
      expect(Object.prototype.hasOwnProperty.call(nested, 'constructor')).toBe(false);
      expect(nested.ok).toBe(1);
    });

    it('rejects primitives, malformed JSON, and arrays in safeParseStorageObject', () => {
      expect(safeParseStorageObject('"just-a-string"')).toBeNull();
      expect(safeParseStorageObject('[1,2,3]')).toBeNull();
      expect(safeParseStorageObject('{broken-json')).toBeNull();
    });

    it('filters invalid array entries and strips unsafe keys in safeParseStorageArray', () => {
      const raw = JSON.stringify([
        { title: 'Valid Goal', description: 'Valid Desc' },
        { title: 123, description: null },
        null,
      ]);
      const result = safeParseStorageArray<{ title: string; description: string }>(
        raw,
        (item): item is { title: string; description: string } =>
          Boolean(
            item &&
              typeof item === 'object' &&
              typeof (item as Record<string, unknown>).title === 'string' &&
              typeof (item as Record<string, unknown>).description === 'string'
          )
      );

      expect(result).toHaveLength(1);
      expect(result?.[0].title).toBe('Valid Goal');
      expect(stripUnsafeKeys({ prototype: 'bad', safe: 'ok' })).toEqual({ safe: 'ok' });
    });

    it('sanitizes dangerous avatar and social URLs when saving or loading custom profiles', () => {
      const saved = ApiService.saveCustomProfile('user-1', {
        id: 42,
        name: 'Jane Doe',
        vanitySlug: 'jane-doe<script>',
        headline: 'Principal Engineer',
        bio: 'Distributed systems.',
        location: 'Austin, TX',
        email: 'jane@example.com',
        avatarUrl: 'javascript:alert(1)',
        githubUrl: 'javascript:alert(2)',
        linkedinUrl: 'data:text/html,evil',
        skills: ['C#', 'React'],
        experienceYears: 8,
        updatedAt: new Date().toISOString(),
      });

      expect(saved.vanitySlug).toBe('jane-doescript');
      expect(saved.avatarUrl).toBe('');
      expect(saved.githubUrl).toBe('https://github.com');
      expect(saved.linkedinUrl).toBe('https://linkedin.com');
    });
  });

  describe('Spreadsheet Column-Bomb & Expanded CSV Formula-Injection Defenses', () => {
    it('blocks <c r="ZZZZZZ1"> sparse column-allocation bombs in xlsxCodec', async () => {
      expect(colLettersToZeroIndex('A1')).toBe(0);
      expect(colLettersToZeroIndex('DY1')).toBe(128);
      expect(colLettersToZeroIndex('DZ1')).toBe(-1);
      expect(colLettersToZeroIndex('ZZZZZZ1')).toBe(-1);

      const maliciousXlsx = buildZipStore([
        {
          name: 'xl/worksheets/sheet1.xml',
          content:
            '<?xml version="1.0" encoding="utf-8"?>' +
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
            '<sheetData>' +
            '<row r="1">' +
            '<c r="A1" t="inlineStr"><is><t>Safe Title</t></is></c>' +
            '<c r="ZZZZZZ1" t="inlineStr"><is><t>Column Bomb</t></is></c>' +
            '<c r="B1" t="inlineStr"><is><t>Safe Category</t></is></c>' +
            '</row>' +
            '</sheetData>' +
            '</worksheet>',
        },
      ]);

      const rows = await readXlsxRows(maliciousXlsx.buffer as ArrayBuffer);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual(['Safe Title', 'Safe Category']);
      expect(rows[0].length).toBe(2);
    });

    it('neutralizes newline, pipe, tab, and leading-whitespace formula prefixes in sanitizeCsvCell', () => {
      expect(sanitizeCsvCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
      expect(sanitizeCsvCell('   |calc.exe')).toBe("'   |calc.exe");
      expect(sanitizeCsvCell('|cmd')).toBe("'|cmd");
      expect(sanitizeCsvCell('\n=1+1')).toBe('"\'\n=1+1"');
      expect(sanitizeCsvCell('  \t+cmd')).toBe("'  \t+cmd");
      expect(sanitizeCsvCell('Safe Text')).toBe('Safe Text');
    });
  });

  describe('Bearer Token Audience Scoping & Telemetry Upload Limits', () => {
    const makeJwt = (payload: Record<string, unknown>): string => {
      const encode = (obj: Record<string, unknown>) =>
        btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
    };

    it('never forwards Supabase OAuth tokens to .NET API endpoints while allowing CareerPlatform.Api tokens', async () => {
      const supabaseJwt = makeJwt({
        iss: 'https://xudbpjhloclfrirzexhu.supabase.co/auth/v1',
        sub: '11111111-2222-3333-4444-555555555555',
        role: 'authenticated',
      });
      const dotNetJwt = makeJwt({
        iss: 'CareerPlatform.Api',
        aud: 'CareerPlatform.Web',
        role: 'admin',
      });

      expect(ApiService.isDotNetApiToken(supabaseJwt)).toBe(false);
      expect(ApiService.isDotNetApiToken(dotNetJwt)).toBe(true);

      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response(null, { status: 401 }));

      ApiService.setSession(supabaseJwt, {
        id: '11111111-2222-3333-4444-555555555555',
        name: 'OAuth Visitor',
        email: 'visitor@example.com',
        role: 'recruiter',
        avatarUrl: '',
      });

      await ApiService.createGoal({ title: 'Personal Goal', category: 'Technical' });
      const supabaseCallHeaders = fetchSpy.mock.calls[0]?.[1]?.headers as Record<string, string>;
      expect(supabaseCallHeaders.Authorization).toBeUndefined();

      fetchSpy.mockClear();
      ApiService.setSession(dotNetJwt, {
        id: 'admin-id',
        name: 'Portfolio Admin',
        email: 'jfbendfeldt@gmail.com',
        role: 'admin',
        avatarUrl: '',
      });

      await ApiService.createGoal({ title: 'Admin Goal', category: 'Technical' });
      const dotNetCallHeaders = fetchSpy.mock.calls[0]?.[1]?.headers as Record<string, string>;
      expect(dotNetCallHeaders.Authorization).toBe(`Bearer ${dotNetJwt}`);
    });

    it('enforces GPX/FIT file size ceilings, filters invalid WGS84 coordinates, and downsamples > 1,500 GPX points', async () => {
      const oversizedGpx = {
        name: 'huge.gpx',
        size: 15 * 1024 * 1024 + 1,
        text: async () => '',
      } as unknown as File;
      await expect(ApiService.uploadFitFile(oversizedGpx)).rejects.toThrow(/15 MB/);

      const oversizedFit = {
        name: 'huge.fit',
        size: 50 * 1024 * 1024 + 1,
      } as unknown as File;
      await expect(ApiService.uploadFitFile(oversizedFit)).rejects.toThrow(/50 MB/);

      const manyValidPts = Array.from({ length: 1800 }, (_, idx) => {
        const lat = (30.2 + idx * 0.0001).toFixed(5);
        const lon = (-97.7 - idx * 0.0001).toFixed(5);
        return `<trkpt lat="${lat}" lon="${lon}"><ele>${200 + (idx % 10)}</ele></trkpt>`;
      }).join('');

      const mixedGpxXml =
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<gpx version="1.1"><trk><trkseg>` +
        `<trkpt lat="NaN" lon="-97.7"><ele>100</ele></trkpt>` +
        `<trkpt lat="95.5" lon="-97.7"><ele>100</ele></trkpt>` +
        `<trkpt lat="30.2" lon="-195.0"><ele>100</ele></trkpt>` +
        manyValidPts +
        `</trkseg></trk></gpx>`;

      const validGpxFile = new File([mixedGpxXml], 'austin_trail.gpx', { type: 'application/gpx+xml' });
      const parsed = await ApiService.uploadFitFile(validGpxFile);

      expect(parsed.points.length).toBeLessThanOrEqual(ApiService.MAX_GPX_RENDER_POINTS);
      expect(
        parsed.points.every(
          (p) => Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180
        )
      ).toBe(true);
    });
  });
});

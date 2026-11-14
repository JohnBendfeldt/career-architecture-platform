import { describe, it, expect, beforeEach } from 'vitest';
import {
  isSafeHttpsUrl,
  isSafeImageUrl,
  sanitizeExternalUrl,
  stripUnsafeKeys,
  safeParseStorageObject,
  safeParseStorageArray,
} from '../utils/security';
import { ApiService } from '../services/api';

describe('Security Utilities & Storage Hardening', () => {
  beforeEach(() => {
    localStorage.clear();
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
});

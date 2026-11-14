import type {
  CareerEntryPrefill,
  Category,
  Goal,
  LearningResource,
} from '../types';
import { sanitizeExternalUrl } from './security';

export const DEFAULT_SKILL_TARGET_HOURS = 12;

function roundQuarterHour(hours: number): number {
  const clamped = Math.max(0.25, Math.min(24, hours));
  return Math.round(clamped * 100) / 100;
}

export function parseResourceDurationHours(
  duration: string | undefined,
  provider?: string
): number {
  const text = (duration || '').trim().toLowerCase();
  if (text) {
    const comboMatch = text.match(/(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?\s*(\d+)\s*m(?:ins?|inutes?)?/i);
    if (comboMatch) {
      const hrs = Number(comboMatch[1]);
      const mins = Number(comboMatch[2]);
      if (Number.isFinite(hrs) && Number.isFinite(mins)) {
        return Math.max(0.5, Math.min(24, Math.round((hrs + mins / 60) * 4) / 4));
      }
    }

    const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i);
    if (hourMatch) {
      const hrs = Number(hourMatch[1]);
      if (Number.isFinite(hrs) && hrs > 0) {
        return roundQuarterHour(hrs);
      }
    }

    const minMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)\b/i);
    if (minMatch) {
      const mins = Number(minMatch[1]);
      if (Number.isFinite(mins) && mins > 0) {
        return Math.max(0.5, Math.min(24, Math.round((mins / 60) * 4) / 4));
      }
    }
  }

  return provider?.trim().toLowerCase() === 'udemy' ? 2 : 1;
}

export function inferSkillCategoryId(
  skill: string,
  categories: Category[]
): number | null {
  if (!categories || categories.length === 0) return null;

  const findCat = (targetName: string): number | null => {
    const matched = categories.find(
      (c) => c.name.trim().toLowerCase() === targetName.toLowerCase()
    );
    return matched ? matched.id : null;
  };

  const lower = (skill || '').toLowerCase();

  if (/\b(qa|test|testing|vitest|playwright|xunit|tdd|selenium)\b/i.test(lower)) {
    return findCat('Quality Assurance') ?? findCat('Development') ?? categories[0].id;
  }
  if (
    /\b(docker|kubernetes|k8s|aws|azure|cloud|devops|pipeline)\b/i.test(lower) ||
    lower.includes('ci/cd')
  ) {
    return findCat('Cloud Computing') ?? findCat('Development') ?? categories[0].id;
  }
  if (
    /\b(ai|llm|gemini|agent|agents|python|fastapi|garmin|fit|geo|geospatial|leaflet|postgis|data)\b/i.test(lower) ||
    lower.includes('machine learning')
  ) {
    return findCat('Data Science') ?? findCat('Development') ?? categories[0].id;
  }
  if (/\b(security|jwt|oauth|auth|cors|owasp|cyber)\b/i.test(lower)) {
    return findCat('Security') ?? findCat('Development') ?? categories[0].id;
  }
  if (/\b(leadership|mentor|mentoring)\b/i.test(lower) || lower.includes('team management')) {
    return findCat('Leadership') ?? findCat('Development') ?? categories[0].id;
  }
  if (/\b(agile|scrum|project|roadmap)\b/i.test(lower)) {
    return findCat('Project Management') ?? findCat('Development') ?? categories[0].id;
  }
  if (/\b(design|ui|ux|css|figma)\b/i.test(lower)) {
    return findCat('Design') ?? findCat('Development') ?? categories[0].id;
  }

  return findCat('Development') ?? categories[0].id;
}

export function findMatchingGoalForSkill(
  skill: string,
  goals: Goal[]
): Goal | null {
  const trimmed = (skill || '').trim();
  if (!trimmed || !goals || goals.length === 0) return null;

  const norm = trimmed.toLowerCase();

  const exactTitleMatch = goals.find((g) => {
    const t = (g.title || '').trim().toLowerCase();
    return t === `master ${norm}` || t === norm;
  });
  if (exactTitleMatch) return exactTitleMatch;

  const exactTagMatch = goals.find((g) =>
    Array.isArray(g.tags) &&
    g.tags.some((tag) => (tag || '').trim().toLowerCase() === norm)
  );
  if (exactTagMatch) return exactTagMatch;

  const substringMatch = goals.find((g) => {
    const titleLower = (g.title || '').toLowerCase();
    if (norm.length >= 3 && titleLower.includes(norm)) {
      return true;
    }
    return (
      Array.isArray(g.tags) &&
      g.tags.some((tag) => {
        const tagLower = (tag || '').trim().toLowerCase();
        return tagLower.length >= 4 && norm.includes(tagLower);
      })
    );
  });

  return substringMatch ?? null;
}

export function buildResourceEntryPrefill(
  skill: string,
  resource: LearningResource,
  categories: Category[],
  goals: Goal[]
): CareerEntryPrefill {
  const fallbackBase =
    resource.provider?.trim().toLowerCase() === 'udemy'
      ? 'https://www.udemy.com'
      : 'https://www.youtube.com';
  const safeUrl = sanitizeExternalUrl(resource.url, fallbackBase);
  const cleanSkill = skill.trim() || 'Technical Skill';

  return {
    title: (resource.title || `${cleanSkill} Study Session`).trim().slice(0, 200),
    description: `Studied ${cleanSkill} via ${resource.provider} (${resource.author}) — ${safeUrl}`,
    hours: parseResourceDurationHours(resource.duration, resource.provider),
    categoryId: inferSkillCategoryId(cleanSkill, categories),
    goalId: findMatchingGoalForSkill(cleanSkill, goals)?.id ?? null,
  };
}

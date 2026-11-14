import type { AnnualProgress, CareerEntry, Category, CreateCareerEntryInput, Goal } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 1, name: 'Development', description: 'Software development and programming skills', displayOrder: 1 },
  { id: 2, name: 'Quality Assurance', description: 'Testing, quality control, and assurance practices', displayOrder: 2 },
  { id: 3, name: 'Leadership', description: 'Professional growth and leadership skills', displayOrder: 3 },
  { id: 4, name: 'Cloud Computing', description: 'Cloud platforms and services', displayOrder: 4 },
  { id: 5, name: 'Data Science', description: 'Data analysis, machine learning, and AI', displayOrder: 5 },
  { id: 6, name: 'Security', description: 'Cybersecurity and information security', displayOrder: 6 },
  { id: 7, name: 'Project Management', description: 'Project planning and execution methodologies', displayOrder: 7 },
  { id: 8, name: 'Communication', description: 'Interpersonal and presentation skills', displayOrder: 8 },
  { id: 9, name: 'Design', description: 'UI/UX and graphic design skills', displayOrder: 9 }
];

export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculatePercentComplete(completedHours: number, goalHours: number): number {
  if (!Number.isFinite(goalHours) || goalHours <= 0) {
    return 0;
  }
  return Math.round(((completedHours / goalHours) * 100) * 100) / 100;
}

export function getQuarterlyCheckpoint(
  now: Date,
  year: number
): { expectedPercent: number; quarterLabel: string } {
  const currentYear = now.getFullYear();
  if (year < currentYear) {
    return { expectedPercent: 100, quarterLabel: `FY ${year} • Completed Year` };
  }
  if (year > currentYear) {
    return { expectedPercent: 0, quarterLabel: `FY ${year} • Upcoming` };
  }

  const month = now.getMonth() + 1; // 1..12
  if (month <= 3) {
    return { expectedPercent: 0, quarterLabel: 'Q1 • Building Momentum' };
  }
  if (month <= 6) {
    return { expectedPercent: 25, quarterLabel: 'Q2 • 25% Checkpoint' };
  }
  if (month <= 9) {
    return { expectedPercent: 50, quarterLabel: 'Q3 • 50% Checkpoint' };
  }
  return { expectedPercent: 75, quarterLabel: 'Q4 • 75% Checkpoint' };
}

export function computeAnnualProgress(
  entries: CareerEntry[],
  annualGoalHours: number,
  year: number,
  now: Date = new Date()
): AnnualProgress {
  const yearPrefix = `${year}-`;
  const yearEntries = entries.filter((e) => e.startDate.startsWith(yearPrefix));
  const rawSum = yearEntries.reduce((acc, e) => acc + (Number(e.hours) || 0), 0);
  const completedHours = Math.round(rawSum * 100) / 100;
  const percentComplete = calculatePercentComplete(completedHours, annualGoalHours);
  const { expectedPercent, quarterLabel } = getQuarterlyCheckpoint(now, year);
  const isOnTrack = percentComplete >= expectedPercent;

  return {
    annualGoalHours,
    completedHours,
    percentComplete,
    totalEntries: yearEntries.length,
    year,
    isOnTrack,
    expectedProgressPercent: expectedPercent,
    quarterLabel
  };
}

export function enrichGoalsWithEntries(goals: Goal[], entries: CareerEntry[]): Goal[] {
  const statsByGoal = new Map<number, { hours: number; count: number }>();

  for (const entry of entries) {
    if (typeof entry.goalId !== 'number') continue;
    const prev = statsByGoal.get(entry.goalId) ?? { hours: 0, count: 0 };
    statsByGoal.set(entry.goalId, {
      hours: Math.round((prev.hours + (Number(entry.hours) || 0)) * 100) / 100,
      count: prev.count + 1
    });
  }

  return goals.map((goal) => {
    const stats = statsByGoal.get(goal.id) ?? { hours: 0, count: 0 };
    const hasTargetHours = typeof goal.targetHours === 'number' && goal.targetHours > 0;

    if (!hasTargetHours) {
      return {
        ...goal,
        loggedHours: stats.hours,
        entryCount: stats.count
      };
    }

    const pct = Math.min(100, Math.round((stats.hours / (goal.targetHours as number)) * 100));
    const nextStatus: Goal['status'] =
      pct >= 100 ? 'Completed' : pct === 0 && goal.status === 'Upcoming' ? 'Upcoming' : 'InProgress';

    return {
      ...goal,
      loggedHours: stats.hours,
      entryCount: stats.count,
      progress: pct,
      status: nextStatus
    };
  });
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validateCareerEntry(
  input: CreateCareerEntryInput,
  now: Date = new Date()
): string | null {
  const title = (input.title ?? '').trim();
  if (title.length < 2 || title.length > 200) {
    return 'Title must be between 2 and 200 characters.';
  }

  if (input.description && input.description.length > 2000) {
    return 'Description must be 2,000 characters or fewer.';
  }

  if (!Number.isFinite(input.hours) || input.hours < 0.01 || input.hours > 999.99) {
    return 'Hours must be between 0.01 and 999.99.';
  }

  if (!DATE_PATTERN.test(input.startDate) || !DATE_PATTERN.test(input.endDate)) {
    return 'Start date and end date must use YYYY-MM-DD format.';
  }

  if (input.startDate > input.endDate) {
    return 'Start date cannot be after end date.';
  }

  const today = toLocalDateString(now);
  if (input.endDate > today) {
    return 'End date cannot be in the future.';
  }

  return null;
}

export function formatEntryHours(hours: number): string {
  const rounded = Math.round(hours * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}` : `${Number(rounded.toFixed(2))}`;
}

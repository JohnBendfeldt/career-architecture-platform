export interface Profile {
  id: number;
  name: string;
  vanitySlug?: string;
  headline: string;
  bio: string;
  location: string;
  email: string;
  avatarUrl: string;
  githubUrl: string;
  linkedinUrl: string;
  websiteUrl?: string;
  liveProjectUrl?: string;
  skills: string[];
  experienceYears: number;
  annualGoalHours?: number;
  updatedAt: string;
}

export interface Goal {
  id: number;
  title: string;
  description: string;
  category: 'Technical' | 'Personal';
  progress: number;
  targetHours?: number | null;
  loggedHours?: number;
  entryCount?: number;
  targetDate: string;
  status: 'InProgress' | 'Completed' | 'Upcoming';
  tags: string[];
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  displayOrder: number;
}

export interface CareerEntry {
  id: number;
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  hours: number;
  categoryId?: number | null;
  category?: string | null;
  goalId?: number | null;
  goalTitle?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateCareerEntryInput {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  hours: number;
  categoryId?: number | null;
  goalId?: number | null;
}

export interface AnnualProgress {
  annualGoalHours: number;
  completedHours: number;
  percentComplete: number;
  totalEntries: number;
  year: number;
  isOnTrack: boolean;
  expectedProgressPercent: number;
  quarterLabel: string;
}

export interface ParsedImportRow {
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  hours: number;
  category: string | null;
  categoryId: number | null;
  unrecognizedCategory: string | null;
  goalTitle: string | null;
  goalId: number | null;
  unrecognizedGoal: string | null;
}

export interface ImportCareerEntryRowPayload {
  title: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  hours: number;
  category?: string | null;
  categoryId?: number | null;
  goalTitle?: string | null;
  goalId?: number | null;
}

export interface ImportCareerEntryRowResult {
  rowNumber: number;
  title: string;
  hours: number;
  startDate: string;
  endDate: string;
  success: boolean;
  entryId?: number | null;
  errorMessage?: string | null;
  isDuplicate?: boolean;
}

export interface ImportCareerEntriesResult {
  success: boolean;
  status?: number;
  message: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  duplicateCount: number;
  results: ImportCareerEntryRowResult[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RoutePoint {
  lat: number;
  lon: number;
  elevation: number;
  timestamp: string;
}

export interface RouteAnnotation {
  id: number;
  lat: number;
  lon: number;
  title: string;
  text: string;
  type: 'start' | 'checkpoint' | 'highlight' | 'finish';
}

export interface RouteData {
  activityName: string;
  recordedDevice: string;
  distanceKm: number;
  elevationGainM: number;
  durationMinutes: number;
  points: RoutePoint[];
  annotations: RouteAnnotation[];
}

export interface RideSummary {
  id: string;
  title: string;
  distanceKm: number;
  elevationGainM: number;
  durationMinutes: number;
  date: string;
}

export interface LearningResource {
  title: string;
  provider: string;
  author: string;
  duration: string;
  url: string;
  thumbnailUrl: string;
  badge: string;
}

export interface LearningResourcesResponse {
  skill: string;
  resources: LearningResource[];
}

export interface ExtractSkillsResponse {
  skills: string[];
  source?: 'gemini' | 'backend' | 'client_fallback';
  model?: string;
}


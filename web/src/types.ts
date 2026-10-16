export interface Profile {
  id: number;
  name: string;
  headline: string;
  bio: string;
  location: string;
  email: string;
  avatarUrl: string;
  githubUrl: string;
  linkedinUrl: string;
  skills: string[];
  experienceYears: number;
  updatedAt: string;
}

export interface Goal {
  id: number;
  title: string;
  description: string;
  category: 'Technical' | 'Personal';
  progress: number;
  targetDate: string;
  status: 'InProgress' | 'Completed' | 'Upcoming';
  tags: string[];
  createdAt: string;
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
}


export const FACULTIES = [
  'Faculty of Engineering and Technology',
  'Faculty of Health and Biomedical Science',
  'Faculty of Agriculture',
  'Faculty of Business and Management Sciences',
  'Faculty of Education',
  'Faculty of Home Economics and Social Works',
] as const;

export const LEVELS = ['Level 100', 'Level 200', 'Level 300'] as const;

export type Faculty = typeof FACULTIES[number];
export type Level = typeof LEVELS[number];

export interface StudyNote {
  id: string;
  courseTitle: string;
  topic: string;
  lecturer: string;
  level: Level;
  faculty: Faculty;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  isPublished: boolean;
  uploadDate: string;
  lastUpdated: string;
  ocrText?: string;
}

export type StudentNavStep =
  | 'home'
  | 'choose-level'
  | 'choose-faculty'
  | 'course-list'
  | 'pdf-reader'
  | 'search-results'
  | 'downloads';

export type AppView = 'student' | 'admin' | 'admin-login';

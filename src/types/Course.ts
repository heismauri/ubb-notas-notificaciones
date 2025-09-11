export interface Course {
  name: string;
  code: string;
  semester: string;
  year: string;
  section: string;
  other: string;
  modular: boolean;
  marksCount?: number;
}

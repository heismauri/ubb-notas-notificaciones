export interface Course {
  name: string;
  code: number;
  section: number;
  year: number;
  semester: number;
  run: string;
  modular: boolean;
  other?: string;
  marksCount?: number;
  totalMarksCount?: number;
}

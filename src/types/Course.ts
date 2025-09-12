export interface Course {
  name: string;
  code: number;
  section: number;
  year: number;
  semester: number;
  modular: boolean;
  other?: string;
  marksCount?: number;
}

import { Student } from "@/types/Student";

const retrieveStudents = async (env: Env): Promise<Student[]> => {
  const studentsKV = await env.DATA.get("students");
  const students: Student[] = studentsKV ? JSON.parse(studentsKV) : [];
  if (students.length === 0) {
    throw new Error("No se encontraron estudiantes");
  }
  return students;
};

export { retrieveStudents };

import { Career } from "@/types/Career";

export interface Student {
  run: string;
  firstName: string;
  lastName: string;
  discordId?: string;
}

export interface StudentWithCareer extends Student {
  career: Career;
}

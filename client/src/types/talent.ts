import type { JobApplication } from "./application";

export interface TalentsListResponse {
  totalApplications: number;
  numOfPages: number;
  currentPage: number;
  applications: JobApplication[];
}

export interface TalentDetailResponse {
  talent: JobApplication[];
}

export interface ApiErrorPayload {
  msg: string;
  requestId?: string;
}

export class ApiError extends Error {
  status: number;
  requestId?: string;

  constructor(message: string, status: number, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.requestId = requestId;
  }
}

export type SortOrder = "newest" | "oldest" | "a-z" | "z-a";

export interface JobPage {
  totalJobs: number;
  numOfPages: number;
  currentPage: number;
}

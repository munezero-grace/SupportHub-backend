export interface ApiError extends Error {
  status?: number;
  code?: string;
  message: string;
}

import { z } from 'zod';

export interface ApiError {
  code: number;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  error: ApiError | null;
  timestamp: string;
}

export interface Pagination {
  hasNext: boolean;
  nextCursor: number | null;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

export function withPagination<T extends z.ZodTypeAny>(schema: T) {
  return z.object({
    data: z.array(schema),
    pagination: z.object({
      hasNext: z.boolean(),
      nextCursor: z.number().nullable(),
    }),
  });
}

export class RequestError extends Error {
  constructor(
    message: string,
    public code: number,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'RequestError';
  }
}

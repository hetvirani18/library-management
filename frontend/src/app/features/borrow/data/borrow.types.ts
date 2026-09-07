import { z } from 'zod';
import { withPagination } from '../../../core/api/api-response.types';

export const BorrowRecordSchema = z.object({
  recordId: z.number(),
  bookId: z.number(),
  bookTitle: z.string().nullable(),
  userId: z.string(),
  userFullName: z.string().nullable(),
  borrowedAt: z.string(),
  dueDate: z.string(),
  returnedAt: z.string().nullable(),
  isOverdue: z.boolean(),
});
export type BorrowRecord = z.infer<typeof BorrowRecordSchema>;

export const PaginatedBorrowRecordsSchema = withPagination(BorrowRecordSchema);

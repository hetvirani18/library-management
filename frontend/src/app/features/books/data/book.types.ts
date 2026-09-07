import { z } from 'zod';
import { withPagination } from '../../../core/api/api-response.types';

export const BookSchema = z.object({
  bookId: z.number(),
  title: z.string(),
  isbn: z.string(),
  genre: z.string(),
  authorName: z.string(),
  totalCopies: z.number(),
  availableCopies: z.number(),
  coverImageUrl: z.string().nullable(),
});
export type Book = z.infer<typeof BookSchema>;

export const PaginatedBooksSchema = withPagination(BookSchema);

export interface BookInput {
  title: string;
  isbn: string;
  genre: string;
  authorName: string;
  totalCopies: number;
}

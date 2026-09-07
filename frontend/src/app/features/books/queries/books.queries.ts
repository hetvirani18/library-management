import { QueryClient } from '@tanstack/angular-query-experimental';
import { BooksService, BooksPage } from '../data/books.service';
import { BookInput } from '../data/book.types';

export function booksQueryOptions(booksService: BooksService, page: () => BooksPage) {
  return {
    queryKey: ['books', page()] as const,
    queryFn: () => booksService.list(page()),
  };
}

export function createBookMutationOptions(booksService: BooksService, queryClient: QueryClient) {
  return {
    mutationFn: (input: BookInput) => booksService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] }),
  };
}

export function updateBookMutationOptions(booksService: BooksService, queryClient: QueryClient) {
  return {
    mutationFn: ({ bookId, input }: { bookId: number; input: BookInput }) => booksService.update(bookId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] }),
  };
}

export function deleteBookMutationOptions(booksService: BooksService, queryClient: QueryClient) {
  return {
    mutationFn: (bookId: number) => booksService.delete(bookId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] }),
  };
}

import { QueryClient } from '@tanstack/angular-query-experimental';
import { BorrowService, BorrowPage } from '../data/borrow.service';

export function borrowRecordsQueryOptions(borrowService: BorrowService, page: () => BorrowPage) {
  return {
    queryKey: ['borrow', page()] as const,
    queryFn: () => borrowService.list(page()),
  };
}

export function borrowBookMutationOptions(borrowService: BorrowService, queryClient: QueryClient) {
  return {
    mutationFn: ({ bookId, memberId }: { bookId: number; memberId: string }) => borrowService.borrow(bookId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrow'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  };
}

export function returnBookMutationOptions(borrowService: BorrowService, queryClient: QueryClient) {
  return {
    mutationFn: ({ bookId, memberId }: { bookId: number; memberId: string }) => borrowService.return(bookId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrow'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  };
}

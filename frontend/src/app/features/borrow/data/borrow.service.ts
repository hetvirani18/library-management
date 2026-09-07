import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/api/api-client';
import { Paginated } from '../../../core/api/api-response.types';
import { BorrowRecord, BorrowRecordSchema, PaginatedBorrowRecordsSchema } from './borrow.types';

export type BorrowListView = 'all' | 'overdue';

export interface BorrowPage {
  view: BorrowListView;
  cursor: number;
  limit?: number;
}

export interface MyHistoryPage {
  cursor: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class BorrowService {
  private readonly api = inject(ApiClient);

  async list(page: BorrowPage): Promise<Paginated<BorrowRecord>> {
    const params = new URLSearchParams();
    params.set('cursor', String(page.cursor));
    params.set('limit', String(page.limit ?? 20));

    const endpoint = page.view === 'overdue' ? `/borrow/overdue?${params}` : `/borrow/all?${params}`;
    const result = await this.api.get<unknown>(endpoint);
    return PaginatedBorrowRecordsSchema.parse(result.data);
  }

  async myHistory(page: MyHistoryPage): Promise<Paginated<BorrowRecord>> {
    const params = new URLSearchParams();
    params.set('cursor', String(page.cursor));
    params.set('limit', String(page.limit ?? 20));

    const result = await this.api.get<unknown>(`/borrow/my-history?${params}`);
    return PaginatedBorrowRecordsSchema.parse(result.data);
  }

  async borrow(bookId: number, memberId: string): Promise<BorrowRecord> {
    const result = await this.api.post<unknown>('/borrow', { bookId, memberId });
    return BorrowRecordSchema.parse(result.data);
  }

  async return(bookId: number, memberId: string): Promise<BorrowRecord> {
    const result = await this.api.post<unknown>('/borrow/return', { bookId, memberId });
    return BorrowRecordSchema.parse(result.data);
  }
}

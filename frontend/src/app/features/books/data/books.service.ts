import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/api/api-client';
import { Paginated } from '../../../core/api/api-response.types';
import { Book, BookInput, PaginatedBooksSchema, BookSchema } from './book.types';

export interface BooksPage {
  search: string;
  cursor: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class BooksService {
  private readonly api = inject(ApiClient);

  async list(page: BooksPage): Promise<Paginated<Book>> {
    const params = new URLSearchParams();
    params.set('cursor', String(page.cursor));
    params.set('limit', String(page.limit ?? 20));

    const endpoint = page.search.trim()
      ? `/books/search?q=${encodeURIComponent(page.search.trim())}&${params}`
      : `/books?${params}`;

    const result = await this.api.get<unknown>(endpoint);
    return PaginatedBooksSchema.parse(result.data);
  }

  async listAvailable(limit = 100): Promise<Book[]> {
    const params = new URLSearchParams({ cursor: '0', limit: String(limit) });
    const result = await this.api.get<unknown>(`/books/available?${params}`);
    return PaginatedBooksSchema.parse(result.data).data;
  }

  async create(input: BookInput): Promise<Book> {
    const result = await this.api.post<unknown>('/books', input);
    return BookSchema.parse(result.data);
  }

  async update(bookId: number, input: BookInput): Promise<Book> {
    const result = await this.api.put<unknown>(`/books/${bookId}`, input);
    return BookSchema.parse(result.data);
  }

  async delete(bookId: number): Promise<void> {
    await this.api.delete(`/books/${bookId}`);
  }
}

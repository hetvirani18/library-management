import { Component, computed, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch } from '@ng-icons/lucide';
import { booksQueryOptions } from '../../../features/books/queries/books.queries';
import { BooksService } from '../../../features/books/data/books.service';
import { Book } from '../../../features/books/data/book.types';

@Component({
  selector: 'app-member-catalog',
  standalone: true,
  imports: [NgIcon],
  providers: [provideIcons({ lucideSearch })],
  templateUrl: './catalog.html',
})
export class MemberCatalogComponent {
  private readonly booksService = inject(BooksService);

  protected readonly search = signal('');
  protected readonly cursor = signal(0);
  protected readonly cursorStack = signal<number[]>([]);

  private readonly page = computed(() => ({ search: this.search(), cursor: this.cursor() }));
  private readonly booksQuery = injectQuery(() => booksQueryOptions(this.booksService, this.page));

  protected readonly books = computed<Book[]>(() => this.booksQuery.data()?.data ?? []);
  protected readonly isLoading = computed(() => this.booksQuery.isPending());
  protected readonly isError = computed(() => this.booksQuery.isError());
  protected readonly hasNext = computed(() => this.booksQuery.data()?.pagination.hasNext ?? false);
  protected readonly nextCursor = computed(() => this.booksQuery.data()?.pagination.nextCursor ?? null);
  protected readonly hasPrev = computed(() => this.cursorStack().length > 0);

  onSearchChange(value: string): void {
    this.search.set(value);
    this.cursor.set(0);
    this.cursorStack.set([]);
  }

  nextPage(): void {
    const next = this.nextCursor();
    if (next === null) return;
    this.cursorStack.update((stack) => [...stack, this.cursor()]);
    this.cursor.set(next);
  }

  prevPage(): void {
    const stack = this.cursorStack();
    if (stack.length === 0) return;
    const prev = stack[stack.length - 1];
    this.cursorStack.set(stack.slice(0, -1));
    this.cursor.set(prev);
  }
}

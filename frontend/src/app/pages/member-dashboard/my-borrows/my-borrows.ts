import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { myBorrowHistoryQueryOptions } from '../../../features/borrow/queries/borrow.queries';
import { BorrowService } from '../../../features/borrow/data/borrow.service';
import { BorrowRecord } from '../../../features/borrow/data/borrow.types';

@Component({
  selector: 'app-member-my-borrows',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './my-borrows.html',
})
export class MemberMyBorrowsComponent {
  private readonly borrowService = inject(BorrowService);

  protected readonly cursor = signal(0);
  protected readonly cursorStack = signal<number[]>([]);

  private readonly page = computed(() => ({ cursor: this.cursor() }));
  private readonly historyQuery = injectQuery(() => myBorrowHistoryQueryOptions(this.borrowService, this.page));

  protected readonly records = computed<BorrowRecord[]>(() => this.historyQuery.data()?.data ?? []);
  protected readonly isLoading = computed(() => this.historyQuery.isPending());
  protected readonly isError = computed(() => this.historyQuery.isError());
  protected readonly hasNext = computed(() => this.historyQuery.data()?.pagination.hasNext ?? false);
  protected readonly nextCursor = computed(() => this.historyQuery.data()?.pagination.nextCursor ?? null);
  protected readonly hasPrev = computed(() => this.cursorStack().length > 0);

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

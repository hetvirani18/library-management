import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBookPlus, lucideUndo2 } from '@ng-icons/lucide';
import {
  borrowBookMutationOptions,
  borrowRecordsQueryOptions,
  returnBookMutationOptions,
} from '../../../features/borrow/queries/borrow.queries';
import { BorrowService, BorrowListView } from '../../../features/borrow/data/borrow.service';
import { BorrowRecord } from '../../../features/borrow/data/borrow.types';
import { BooksService } from '../../../features/books/data/books.service';
import { Book } from '../../../features/books/data/book.types';
import { MembersService } from '../../../features/members/data/members.service';
import { Member } from '../../../features/members/data/member.types';
import { RequestError } from '../../../core/api/api-response.types';
import { ModalComponent } from '../../../shared/ui/modal/modal';
import { ButtonComponent } from '../../../shared/ui/button/button';

@Component({
  selector: 'app-librarian-borrows',
  standalone: true,
  imports: [ReactiveFormsModule, NgIcon, ModalComponent, ButtonComponent, DatePipe],
  providers: [provideIcons({ lucideBookPlus, lucideUndo2 })],
  templateUrl: './borrows.html',
})
export class LibrarianBorrowsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly booksService = inject(BooksService);
  private readonly membersService = inject(MembersService);
  private readonly borrowService = inject(BorrowService);
  private readonly queryClient = inject(QueryClient);

  protected readonly view = signal<BorrowListView>('all');
  protected readonly cursor = signal(0);
  protected readonly cursorStack = signal<number[]>([]);

  private readonly page = computed(() => ({ view: this.view(), cursor: this.cursor() }));
  private readonly recordsQuery = injectQuery(() => borrowRecordsQueryOptions(this.borrowService, this.page));

  protected readonly records = computed<BorrowRecord[]>(() => this.recordsQuery.data()?.data ?? []);
  protected readonly isLoading = computed(() => this.recordsQuery.isPending());
  protected readonly isError = computed(() => this.recordsQuery.isError());
  protected readonly hasNext = computed(() => this.recordsQuery.data()?.pagination.hasNext ?? false);
  protected readonly nextCursor = computed(() => this.recordsQuery.data()?.pagination.nextCursor ?? null);
  protected readonly hasPrev = computed(() => this.cursorStack().length > 0);

  private readonly borrowMutation = injectMutation(() => borrowBookMutationOptions(this.borrowService, this.queryClient));
  private readonly returnMutation = injectMutation(() => returnBookMutationOptions(this.borrowService, this.queryClient));

  protected readonly isModalOpen = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly returningId = signal<number | null>(null);

  protected readonly availableBooks = signal<Book[]>([]);
  protected readonly activeMembers = signal<Member[]>([]);
  protected readonly isLoadingOptions = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    bookId: ['', Validators.required],
    memberId: ['', Validators.required],
  });

  setView(view: BorrowListView): void {
    this.view.set(view);
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

  async openAssign(): Promise<void> {
    this.errorMessage.set(null);
    this.form.reset({ bookId: '', memberId: '' });
    this.isModalOpen.set(true);
    this.isLoadingOptions.set(true);

    try {
      const [books, members] = await Promise.all([
        this.booksService.listAvailable(),
        this.membersService.listActive(),
      ]);
      this.availableBooks.set(books);
      this.activeMembers.set(members);
    } catch {
      this.errorMessage.set('Could not load books and members. Try again.');
    } finally {
      this.isLoadingOptions.set(false);
    }
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    const { bookId, memberId } = this.form.getRawValue();

    try {
      await this.borrowMutation.mutateAsync({ bookId: Number(bookId), memberId });
      this.isModalOpen.set(false);
    } catch (error) {
      this.errorMessage.set(error instanceof RequestError ? error.message : 'Could not assign this book.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async returnBook(record: BorrowRecord): Promise<void> {
    if (!confirm(`Mark "${record.bookTitle}" as returned by ${record.userFullName}?`)) {
      return;
    }

    this.returningId.set(record.recordId);
    try {
      await this.returnMutation.mutateAsync({ bookId: record.bookId, memberId: record.userId });
    } catch (error) {
      alert(error instanceof RequestError ? error.message : 'Could not process this return.');
    } finally {
      this.returningId.set(null);
    }
  }
}

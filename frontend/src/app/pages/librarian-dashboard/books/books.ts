import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucidePencil, lucideTrash2, lucideSearch, lucideUpload } from '@ng-icons/lucide';
import {
  booksQueryOptions,
  createBookMutationOptions,
  deleteBookMutationOptions,
  updateBookMutationOptions,
  uploadBookCoverMutationOptions,
} from '../../../features/books/queries/books.queries';
import { BooksService } from '../../../features/books/data/books.service';
import { Book, BookInput } from '../../../features/books/data/book.types';
import { RequestError } from '../../../core/api/api-response.types';
import { ModalComponent } from '../../../shared/ui/modal/modal';
import { ButtonComponent } from '../../../shared/ui/button/button';

@Component({
  selector: 'app-librarian-books',
  standalone: true,
  imports: [ReactiveFormsModule, NgIcon, ModalComponent, ButtonComponent, RouterLink],
  providers: [provideIcons({ lucidePlus, lucidePencil, lucideTrash2, lucideSearch, lucideUpload })],
  templateUrl: './books.html',
})
export class LibrarianBooksComponent {
  private readonly fb = inject(FormBuilder);
  private readonly booksService = inject(BooksService);
  private readonly queryClient = inject(QueryClient);

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

  private readonly createMutation = injectMutation(() => createBookMutationOptions(this.booksService, this.queryClient));
  private readonly updateMutation = injectMutation(() => updateBookMutationOptions(this.booksService, this.queryClient));
  private readonly deleteMutation = injectMutation(() => deleteBookMutationOptions(this.booksService, this.queryClient));
  private readonly uploadCoverMutation = injectMutation(() => uploadBookCoverMutationOptions(this.booksService, this.queryClient));

  protected readonly isModalOpen = signal(false);
  protected readonly editingBook = signal<Book | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly deletingId = signal<number | null>(null);

  protected readonly coverFile = signal<File | null>(null);
  protected readonly coverPreviewUrl = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    isbn: ['', Validators.required],
    genre: ['', Validators.required],
    authorName: ['', Validators.required],
    totalCopies: [1, [Validators.required, Validators.min(0)]],
  });

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

  openCreate(): void {
    this.editingBook.set(null);
    this.errorMessage.set(null);
    this.resetCover(null);
    this.form.reset({ title: '', isbn: '', genre: '', authorName: '', totalCopies: 1 });
    this.isModalOpen.set(true);
  }

  openEdit(book: Book): void {
    this.editingBook.set(book);
    this.errorMessage.set(null);
    this.resetCover(book.coverImageUrl);
    this.form.reset({
      title: book.title,
      isbn: book.isbn,
      genre: book.genre,
      authorName: book.authorName,
      totalCopies: book.totalCopies,
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;

    this.coverFile.set(file);
    const previous = this.coverPreviewUrl();
    if (previous?.startsWith('blob:')) {
      URL.revokeObjectURL(previous);
    }
    this.coverPreviewUrl.set(URL.createObjectURL(file));
  }

  private resetCover(existingUrl: string | null): void {
    const previous = this.coverPreviewUrl();
    if (previous?.startsWith('blob:')) {
      URL.revokeObjectURL(previous);
    }
    this.coverFile.set(null);
    this.coverPreviewUrl.set(existingUrl);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    const input: BookInput = this.form.getRawValue();
    const editing = this.editingBook();

    try {
      const book = editing
        ? await this.updateMutation.mutateAsync({ bookId: editing.bookId, input })
        : await this.createMutation.mutateAsync(input);

      const file = this.coverFile();
      if (file) {
        await this.uploadCoverMutation.mutateAsync({ bookId: book.bookId, file });
      }

      this.isModalOpen.set(false);
    } catch (error) {
      this.errorMessage.set(error instanceof RequestError ? error.message : 'Something went wrong. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async deleteBook(book: Book): Promise<void> {
    if (!confirm(`Delete "${book.title}"? This can't be undone.`)) {
      return;
    }

    this.deletingId.set(book.bookId);
    try {
      await this.deleteMutation.mutateAsync(book.bookId);
    } catch (error) {
      alert(error instanceof RequestError ? error.message : 'Could not delete this book.');
    } finally {
      this.deletingId.set(null);
    }
  }
}

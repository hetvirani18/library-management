import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideUpload, lucideTrash2, lucideArrowLeft } from '@ng-icons/lucide';
import {
  bookQueryOptions,
  deleteBookCoverMutationOptions,
  uploadBookCoverMutationOptions,
} from '../../features/books/queries/books.queries';
import { BooksService } from '../../features/books/data/books.service';
import { AuthService } from '../../core/auth/auth.service';
import { RequestError } from '../../core/api/api-response.types';

@Component({
  selector: 'app-book-detail',
  standalone: true,
  imports: [RouterLink, NgIcon],
  providers: [provideIcons({ lucideUpload, lucideTrash2, lucideArrowLeft })],
  templateUrl: './book-detail.html',
})
export class BookDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly booksService = inject(BooksService);
  private readonly queryClient = inject(QueryClient);
  protected readonly auth = inject(AuthService);

  private readonly bookId = toSignal(
    this.route.paramMap.pipe(map((params) => Number(params.get('id')))),
    { initialValue: 0 },
  );

  private readonly bookQuery = injectQuery(() => bookQueryOptions(this.booksService, this.bookId));

  protected readonly book = computed(() => this.bookQuery.data());
  protected readonly isLoading = computed(() => this.bookQuery.isPending());
  protected readonly isError = computed(() => this.bookQuery.isError());

  protected readonly backPath = computed(() => (this.auth.isLibrarian() ? '/librarian/books' : '/member'));

  private readonly uploadMutation = injectMutation(() => uploadBookCoverMutationOptions(this.booksService, this.queryClient));
  private readonly deleteCoverMutation = injectMutation(() => deleteBookCoverMutationOptions(this.booksService, this.queryClient));

  protected readonly isUploading = signal(false);
  protected readonly coverError = signal<string | null>(null);

  async onCoverSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isUploading.set(true);
    this.coverError.set(null);

    try {
      await this.uploadMutation.mutateAsync({ bookId: this.bookId(), file });
    } catch (error) {
      this.coverError.set(error instanceof RequestError ? error.message : 'Could not upload the cover image.');
    } finally {
      this.isUploading.set(false);
      input.value = '';
    }
  }

  async removeCover(): Promise<void> {
    if (!confirm('Remove this cover image?')) return;

    this.isUploading.set(true);
    this.coverError.set(null);

    try {
      await this.deleteCoverMutation.mutateAsync(this.bookId());
    } catch (error) {
      this.coverError.set(error instanceof RequestError ? error.message : 'Could not remove the cover image.');
    } finally {
      this.isUploading.set(false);
    }
  }
}

import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { AuthService } from '../../../core/auth/auth.service';
import { DashboardService } from '../../../features/dashboard/data/dashboard.service';
import { dashboardStatsQueryOptions } from '../../../features/dashboard/queries/dashboard.queries';

@Component({
  selector: 'app-librarian-overview',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './overview.html',
})
export class LibrarianOverviewComponent {
  protected readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly statsQuery = injectQuery(() => dashboardStatsQueryOptions(this.dashboardService));

  protected readonly stats = computed(() => this.statsQuery.data());
  protected readonly isLoading = computed(() => this.statsQuery.isPending());
  protected readonly isError = computed(() => this.statsQuery.isError());

  protected readonly cards = computed(() => {
    const stats = this.stats();
    return [
      { label: 'Total books', value: stats?.totalBooks },
      { label: 'Total members', value: stats?.totalMembers },
      { label: 'Currently borrowed', value: stats?.currentlyBorrowed },
      { label: 'Overdue', value: stats?.overdueCount },
    ];
  });

  protected readonly quickActions = [
    { label: 'Add a book', description: 'Add a new title to the catalog.', path: '/librarian/books' },
    { label: 'Add a member', description: 'Register a new library member.', path: '/librarian/members' },
    { label: 'Assign a book', description: 'Hand a book to a member.', path: '/librarian/borrows' },
  ];
}

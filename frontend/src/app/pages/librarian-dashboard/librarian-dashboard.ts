import { Component, computed, inject } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';
import { dashboardStatsQueryOptions } from '../../features/dashboard/queries/dashboard.queries';

@Component({
  selector: 'app-librarian-dashboard',
  standalone: true,
  imports: [DashboardHeaderComponent],
  templateUrl: './librarian-dashboard.html',
})
export class LibrarianDashboardComponent {
  protected readonly auth = inject(AuthService);
  private readonly statsQuery = injectQuery(() => dashboardStatsQueryOptions());

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
}

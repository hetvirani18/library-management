import { inject } from '@angular/core';
import { DashboardService } from '../data/dashboard.service';

export function dashboardStatsQueryOptions() {
  const dashboardService = inject(DashboardService);
  return {
    queryKey: ['dashboard', 'stats'] as const,
    queryFn: () => dashboardService.getStats(),
    staleTime: 1000 * 60,
  };
}

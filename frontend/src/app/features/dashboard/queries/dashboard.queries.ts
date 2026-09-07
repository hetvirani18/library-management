import { DashboardService } from '../data/dashboard.service';

export function dashboardStatsQueryOptions(dashboardService: DashboardService) {
  return {
    queryKey: ['dashboard', 'stats'] as const,
    queryFn: () => dashboardService.getStats(),
    staleTime: 1000 * 60,
  };
}

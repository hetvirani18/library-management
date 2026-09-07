import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/api/api-client';
import { DashboardStats, DashboardStatsSchema } from './dashboard.types';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiClient);

  async getStats(): Promise<DashboardStats> {
    const result = await this.api.get<unknown>('/dashboard/stats');
    return DashboardStatsSchema.parse(result.data);
  }
}

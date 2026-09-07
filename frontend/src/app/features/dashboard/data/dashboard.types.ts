import { z } from 'zod';

export const DashboardStatsSchema = z.object({
  totalBooks: z.number(),
  totalMembers: z.number(),
  currentlyBorrowed: z.number(),
  overdueCount: z.number(),
});

export type DashboardStats = z.infer<typeof DashboardStatsSchema>;

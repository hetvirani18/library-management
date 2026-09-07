import { z } from 'zod';
import { withPagination } from '../../../core/api/api-response.types';

export const MemberSchema = z.object({
  userId: z.string(),
  fullName: z.string(),
  email: z.string(),
  role: z.string(),
  isActive: z.boolean(),
  membershipDate: z.string(),
});
export type Member = z.infer<typeof MemberSchema>;

export const PaginatedMembersSchema = withPagination(MemberSchema);

export interface CreateMemberInput {
  fullName: string;
  email: string;
  password: string;
}

export interface UpdateMemberInput {
  fullName: string;
  email: string;
}

import { z } from 'zod';

export const RoleSchema = z.enum(['Librarian', 'Member']);
export type Role = z.infer<typeof RoleSchema>;

export const AuthUserSchema = z.object({
  userId: z.string(),
  fullName: z.string(),
  email: z.string(),
  role: RoleSchema,
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
}

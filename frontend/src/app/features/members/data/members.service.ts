import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/api/api-client';
import { Paginated } from '../../../core/api/api-response.types';
import { CreateMemberInput, Member, MemberSchema, PaginatedMembersSchema, UpdateMemberInput } from './member.types';

export interface MembersPage {
  cursor: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class MembersService {
  private readonly api = inject(ApiClient);

  async list(page: MembersPage): Promise<Paginated<Member>> {
    const params = new URLSearchParams();
    params.set('cursor', String(page.cursor));
    params.set('limit', String(page.limit ?? 20));

    const result = await this.api.get<unknown>(`/members?${params}`);
    return PaginatedMembersSchema.parse(result.data);
  }

  async listActive(limit = 100): Promise<Member[]> {
    const page = await this.list({ cursor: 0, limit });
    return page.data.filter((member) => member.isActive);
  }

  async create(input: CreateMemberInput): Promise<Member> {
    const result = await this.api.post<unknown>('/members', input);
    return MemberSchema.parse(result.data);
  }

  async update(userId: string, input: UpdateMemberInput): Promise<Member> {
    const result = await this.api.put<unknown>(`/members/${userId}`, input);
    return MemberSchema.parse(result.data);
  }

  async resetPassword(userId: string, newPassword: string): Promise<void> {
    await this.api.patch(`/members/${userId}/reset-password`, { newPassword });
  }

  async deactivate(userId: string): Promise<Member> {
    const result = await this.api.patch<unknown>(`/members/${userId}/deactivate`, {});
    return MemberSchema.parse(result.data);
  }

  async activate(userId: string): Promise<Member> {
    const result = await this.api.patch<unknown>(`/members/${userId}/activate`, {});
    return MemberSchema.parse(result.data);
  }
}

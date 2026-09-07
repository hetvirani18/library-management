import { QueryClient } from '@tanstack/angular-query-experimental';
import { MembersService, MembersPage } from '../data/members.service';
import { CreateMemberInput, UpdateMemberInput } from '../data/member.types';

export function membersQueryOptions(membersService: MembersService, page: () => MembersPage) {
  return {
    queryKey: ['members', page()] as const,
    queryFn: () => membersService.list(page()),
  };
}

export function createMemberMutationOptions(membersService: MembersService, queryClient: QueryClient) {
  return {
    mutationFn: (input: CreateMemberInput) => membersService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  };
}

export function updateMemberMutationOptions(membersService: MembersService, queryClient: QueryClient) {
  return {
    mutationFn: ({ userId, input }: { userId: string; input: UpdateMemberInput }) => membersService.update(userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  };
}

export function resetMemberPasswordMutationOptions(membersService: MembersService) {
  return {
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      membersService.resetPassword(userId, newPassword),
  };
}

export function toggleMemberActiveMutationOptions(membersService: MembersService, queryClient: QueryClient) {
  return {
    mutationFn: ({ userId, activate }: { userId: string; activate: boolean }) =>
      activate ? membersService.activate(userId) : membersService.deactivate(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  };
}

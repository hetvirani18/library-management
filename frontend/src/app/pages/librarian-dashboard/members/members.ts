import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { QueryClient, injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideUserPlus, lucidePencil, lucideKeyRound, lucideBan, lucideCheck, lucideEye, lucideEyeOff } from '@ng-icons/lucide';
import {
  createMemberMutationOptions,
  membersQueryOptions,
  resetMemberPasswordMutationOptions,
  toggleMemberActiveMutationOptions,
  updateMemberMutationOptions,
} from '../../../features/members/queries/members.queries';
import { MembersService } from '../../../features/members/data/members.service';
import { Member } from '../../../features/members/data/member.types';
import { RequestError } from '../../../core/api/api-response.types';
import { ModalComponent } from '../../../shared/ui/modal/modal';
import { ButtonComponent } from '../../../shared/ui/button/button';

@Component({
  selector: 'app-librarian-members',
  standalone: true,
  imports: [ReactiveFormsModule, NgIcon, ModalComponent, ButtonComponent, DatePipe],
  providers: [provideIcons({ lucideUserPlus, lucidePencil, lucideKeyRound, lucideBan, lucideCheck, lucideEye, lucideEyeOff })],
  templateUrl: './members.html',
})
export class LibrarianMembersComponent {
  private readonly fb = inject(FormBuilder);
  private readonly membersService = inject(MembersService);
  private readonly queryClient = inject(QueryClient);

  protected readonly cursor = signal(0);
  protected readonly cursorStack = signal<number[]>([]);

  private readonly page = computed(() => ({ cursor: this.cursor() }));
  private readonly membersQuery = injectQuery(() => membersQueryOptions(this.membersService, this.page));

  protected readonly members = computed<Member[]>(() => this.membersQuery.data()?.data ?? []);
  protected readonly isLoading = computed(() => this.membersQuery.isPending());
  protected readonly isError = computed(() => this.membersQuery.isError());
  protected readonly hasNext = computed(() => this.membersQuery.data()?.pagination.hasNext ?? false);
  protected readonly nextCursor = computed(() => this.membersQuery.data()?.pagination.nextCursor ?? null);
  protected readonly hasPrev = computed(() => this.cursorStack().length > 0);

  private readonly createMutation = injectMutation(() => createMemberMutationOptions(this.membersService, this.queryClient));
  private readonly updateMutation = injectMutation(() => updateMemberMutationOptions(this.membersService, this.queryClient));
  private readonly resetPasswordMutation = injectMutation(() => resetMemberPasswordMutationOptions(this.membersService));
  private readonly toggleActiveMutation = injectMutation(() => toggleMemberActiveMutationOptions(this.membersService, this.queryClient));

  protected readonly isModalOpen = signal(false);
  protected readonly editingMember = signal<Member | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly togglingId = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected readonly resetTarget = signal<Member | null>(null);
  protected readonly resetErrorMessage = signal<string | null>(null);
  protected readonly isResetting = signal(false);
  protected readonly showResetPassword = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected readonly resetForm = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  nextPage(): void {
    const next = this.nextCursor();
    if (next === null) return;
    this.cursorStack.update((stack) => [...stack, this.cursor()]);
    this.cursor.set(next);
  }

  prevPage(): void {
    const stack = this.cursorStack();
    if (stack.length === 0) return;
    const prev = stack[stack.length - 1];
    this.cursorStack.set(stack.slice(0, -1));
    this.cursor.set(prev);
  }

  openCreate(): void {
    this.editingMember.set(null);
    this.errorMessage.set(null);
    this.showPassword.set(false);
    this.form.reset({ fullName: '', email: '', password: '' });
    this.form.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.controls.password.updateValueAndValidity();
    this.isModalOpen.set(true);
  }

  openEdit(member: Member): void {
    this.editingMember.set(member);
    this.errorMessage.set(null);
    this.form.reset({ fullName: member.fullName, email: member.email, password: '' });
    this.form.controls.password.clearValidators();
    this.form.controls.password.updateValueAndValidity();
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    const { fullName, email, password } = this.form.getRawValue();
    const editing = this.editingMember();

    try {
      if (editing) {
        await this.updateMutation.mutateAsync({ userId: editing.userId, input: { fullName, email } });
      } else {
        await this.createMutation.mutateAsync({ fullName, email, password });
      }
      this.isModalOpen.set(false);
    } catch (error) {
      this.errorMessage.set(error instanceof RequestError ? error.message : 'Something went wrong. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async toggleActive(member: Member): Promise<void> {
    const action = member.isActive ? 'deactivate' : 'activate';
    if (!confirm(`${member.isActive ? 'Deactivate' : 'Activate'} ${member.fullName}?`)) {
      return;
    }

    this.togglingId.set(member.userId);
    try {
      await this.toggleActiveMutation.mutateAsync({ userId: member.userId, activate: !member.isActive });
    } catch (error) {
      alert(error instanceof RequestError ? error.message : `Could not ${action} this member.`);
    } finally {
      this.togglingId.set(null);
    }
  }

  openResetPassword(member: Member): void {
    this.resetTarget.set(member);
    this.resetErrorMessage.set(null);
    this.showResetPassword.set(false);
    this.resetForm.reset({ newPassword: '' });
  }

  closeResetModal(): void {
    this.resetTarget.set(null);
  }

  async submitReset(): Promise<void> {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const target = this.resetTarget();
    if (!target) return;

    this.isResetting.set(true);
    this.resetErrorMessage.set(null);

    try {
      await this.resetPasswordMutation.mutateAsync({
        userId: target.userId,
        newPassword: this.resetForm.getRawValue().newPassword,
      });
      this.resetTarget.set(null);
    } catch (error) {
      this.resetErrorMessage.set(error instanceof RequestError ? error.message : 'Could not reset the password.');
    } finally {
      this.isResetting.set(false);
    }
  }
}

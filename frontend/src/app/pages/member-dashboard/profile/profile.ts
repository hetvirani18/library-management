import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { RequestError } from '../../../core/api/api-response.types';

@Component({
  selector: 'app-member-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './profile.html',
})
export class MemberProfileComponent {
  protected readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  protected readonly initials = computed(() => {
    const name = this.auth.currentUser()?.fullName.trim() ?? '';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    return (parts[0][0] + (parts[parts.length - 1][0] ?? '')).toUpperCase();
  });

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    fullName: [this.auth.currentUser()?.fullName ?? '', Validators.required],
    email: [this.auth.currentUser()?.email ?? '', [Validators.required, Validators.email]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      await this.auth.updateProfile(this.form.getRawValue());
      this.successMessage.set('Profile updated.');
    } catch (error) {
      this.errorMessage.set(error instanceof RequestError ? error.message : 'Something went wrong. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}

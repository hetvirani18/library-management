import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideEyeOff } from '@ng-icons/lucide';
import { AuthService } from '../../core/auth/auth.service';
import { dashboardRouteFor } from '../../core/auth/dashboard-route';
import { RequestError } from '../../core/api/api-response.types';
import { AuthHeaderComponent } from '../../shared/components/auth-header/auth-header';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthHeaderComponent, NgIcon],
  providers: [provideIcons({ lucideEye, lucideEyeOff })],
  templateUrl: './register.html',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    try {
      const user = await this.auth.register(this.form.getRawValue());
      await this.router.navigateByUrl(dashboardRouteFor(user.role));
    } catch (error) {
      this.errorMessage.set(
        error instanceof RequestError ? error.message : 'Something went wrong. Please try again.',
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }
}

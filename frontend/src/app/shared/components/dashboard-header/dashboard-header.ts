import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeToggleComponent } from '../../ui/theme-toggle/theme-toggle';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [RouterLink, ThemeToggleComponent],
  templateUrl: './dashboard-header.html',
})
export class DashboardHeaderComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/');
  }
}

import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

@Component({
  selector: 'app-member-dashboard',
  standalone: true,
  imports: [DashboardHeaderComponent],
  templateUrl: './member-dashboard.html',
})
export class MemberDashboardComponent {
  protected readonly auth = inject(AuthService);
}

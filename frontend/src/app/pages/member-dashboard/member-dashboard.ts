import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

@Component({
  selector: 'app-member-dashboard',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, DashboardHeaderComponent],
  templateUrl: './member-dashboard.html',
})
export class MemberDashboardComponent {
  protected readonly tabs = [
    { label: 'Catalog', path: '/member', exact: true },
    { label: 'My Borrows', path: '/member/my-borrows', exact: false },
    { label: 'Profile', path: '/member/profile', exact: false },
  ];
}

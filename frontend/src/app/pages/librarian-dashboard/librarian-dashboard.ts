import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

@Component({
  selector: 'app-librarian-dashboard',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, DashboardHeaderComponent],
  templateUrl: './librarian-dashboard.html',
})
export class LibrarianDashboardComponent {
  protected readonly tabs = [
    { label: 'Dashboard', path: '/librarian', exact: true },
    { label: 'Books', path: '/librarian/books', exact: false },
    { label: 'Members', path: '/librarian/members', exact: false },
    { label: 'Borrowing', path: '/librarian/borrows', exact: false },
  ];
}

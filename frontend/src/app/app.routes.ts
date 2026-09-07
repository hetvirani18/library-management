import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { LibrarianDashboardComponent } from './pages/librarian-dashboard/librarian-dashboard';
import { LibrarianOverviewComponent } from './pages/librarian-dashboard/overview/overview';
import { LibrarianBooksComponent } from './pages/librarian-dashboard/books/books';
import { LibrarianMembersComponent } from './pages/librarian-dashboard/members/members';
import { LibrarianBorrowsComponent } from './pages/librarian-dashboard/borrows/borrows';
import { MemberDashboardComponent } from './pages/member-dashboard/member-dashboard';
import { MemberCatalogComponent } from './pages/member-dashboard/catalog/catalog';
import { MemberMyBorrowsComponent } from './pages/member-dashboard/my-borrows/my-borrows';
import { MemberProfileComponent } from './pages/member-dashboard/profile/profile';
import { authGuard, guestGuard, roleGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent, canActivate: [guestGuard] },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
  {
    path: 'librarian',
    component: LibrarianDashboardComponent,
    canActivate: [authGuard, roleGuard('Librarian')],
    children: [
      { path: '', component: LibrarianOverviewComponent },
      { path: 'books', component: LibrarianBooksComponent },
      { path: 'members', component: LibrarianMembersComponent },
      { path: 'borrows', component: LibrarianBorrowsComponent },
    ],
  },
  {
    path: 'member',
    component: MemberDashboardComponent,
    canActivate: [authGuard, roleGuard('Member')],
    children: [
      { path: '', component: MemberCatalogComponent },
      { path: 'my-borrows', component: MemberMyBorrowsComponent },
      { path: 'profile', component: MemberProfileComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];

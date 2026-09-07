import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { LibrarianDashboardComponent } from './pages/librarian-dashboard/librarian-dashboard';
import { MemberDashboardComponent } from './pages/member-dashboard/member-dashboard';
import { authGuard, guestGuard, roleGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent, canActivate: [guestGuard] },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
  {
    path: 'librarian',
    component: LibrarianDashboardComponent,
    canActivate: [authGuard, roleGuard('Librarian')],
  },
  {
    path: 'member',
    component: MemberDashboardComponent,
    canActivate: [authGuard, roleGuard('Member')],
  },
  { path: '**', redirectTo: '' },
];

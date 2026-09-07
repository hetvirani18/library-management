import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { ComingSoonComponent } from './pages/coming-soon/coming-soon';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: ComingSoonComponent, data: { title: 'Log in' } },
  { path: 'register', component: ComingSoonComponent, data: { title: 'Create an account' } },
  { path: '**', redirectTo: '' },
];

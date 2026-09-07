import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggleComponent } from '../../ui/theme-toggle/theme-toggle';

@Component({
  selector: 'app-auth-header',
  standalone: true,
  imports: [RouterLink, ThemeToggleComponent],
  templateUrl: './auth-header.html',
})
export class AuthHeaderComponent {}

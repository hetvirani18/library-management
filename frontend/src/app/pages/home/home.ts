import { Component, afterNextRender, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import AOS from 'aos';
import { ThemeToggleComponent } from '../../shared/ui/theme-toggle/theme-toggle';

const ICONS = {
  catalog: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v18H7.5A2.5 2.5 0 0 0 5 22.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 4.5v15A2.5 2.5 0 0 0 7.5 22H19" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  clock: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v5l3.5 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  dashboard: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M3 9h18M8 4v14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  shield: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2 4 5.5v6c0 5.2 3.4 9 8 10.5 4.6-1.5 8-5.3 8-10.5v-6L12 2Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="m9 12 2 2 4-4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, ThemeToggleComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly features = [
    {
      title: 'Browse the catalog',
      description: 'Search books by title, author, or genre, and see real-time availability.',
      icon: this.sanitizer.bypassSecurityTrustHtml(ICONS.catalog),
    },
    {
      title: 'Track your borrows',
      description: 'See what you currently have out, due dates, and your full borrowing history.',
      icon: this.sanitizer.bypassSecurityTrustHtml(ICONS.clock),
    },
    {
      title: 'Librarian dashboard',
      description: 'Manage the catalog, members, and every checkout from one place.',
      icon: this.sanitizer.bypassSecurityTrustHtml(ICONS.dashboard),
    },
    {
      title: 'Never overbooked',
      description: 'Concurrency-safe checkouts mean two people can never claim the same last copy.',
      icon: this.sanitizer.bypassSecurityTrustHtml(ICONS.shield),
    },
  ];

  constructor() {
    afterNextRender(() => {
      AOS.init({
        duration: 700,
        easing: 'ease-out-cubic',
        once: true,
        offset: 60,
      });
    });
  }
}

import { Component, afterNextRender } from '@angular/core';
import { RouterLink } from '@angular/router';
import AOS from 'aos';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent {
  readonly features = [
    {
      title: 'Browse the catalog',
      description: 'Search books by title, author, or genre, and see real-time availability.',
      icon: '📚',
    },
    {
      title: 'Track your borrows',
      description: 'See what you currently have out, due dates, and your full borrowing history.',
      icon: '🗂️',
    },
    {
      title: 'Librarian dashboard',
      description: 'Manage the catalog, members, and every checkout from one place.',
      icon: '🧾',
    },
    {
      title: 'Never overbooked',
      description: 'Concurrency-safe checkouts mean two people can never claim the same last copy.',
      icon: '🔒',
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

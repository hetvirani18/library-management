import { Component, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <h1 class="text-2xl font-semibold">{{ title }}</h1>
      <p class="max-w-sm text-muted-foreground">
        This page is coming soon — the home page and backend are ready, the rest of the UI is next.
      </p>
      <a routerLink="/" class="text-sm font-medium text-primary hover:underline">← Back home</a>
    </main>
  `,
})
export class ComingSoonComponent {
  private readonly route = inject(ActivatedRoute);
  readonly title = (this.route.snapshot.data['title'] as string) ?? 'Coming soon';
}

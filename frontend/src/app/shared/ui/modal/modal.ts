import { Component, output, input } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  template: `
    <div class="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4" (click)="close.emit()">
      <div
        class="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-[0_24px_60px_-24px_var(--shadow-color)]"
        (click)="$event.stopPropagation()"
      >
        <div class="mb-5 flex items-center justify-between">
          <h2 class="font-serif text-xl font-medium italic tracking-tight">{{ title() }}</h2>
          <button
            type="button"
            (click)="close.emit()"
            class="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 5l14 14M19 5 5 19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </button>
        </div>
        <ng-content />
      </div>
    </div>
  `,
})
export class ModalComponent {
  title = input.required<string>();
  close = output<void>();
}

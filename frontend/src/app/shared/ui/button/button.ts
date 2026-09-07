import { Component, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';

@Component({
  selector: 'app-button',
  standalone: true,
  template: `
    <button [type]="type()" [disabled]="disabled()" [class]="classes()">
      <ng-content />
    </button>
  `,
})
export class ButtonComponent {
  variant = input<ButtonVariant>('primary');
  type = input<'button' | 'submit'>('button');
  disabled = input<boolean>(false);

  classes(): string {
    const base =
      'inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-primary text-primary-foreground hover:opacity-90',
      outline: 'border border-border bg-transparent hover:bg-muted',
      ghost: 'bg-transparent hover:bg-muted',
      danger: 'bg-destructive text-white hover:opacity-90',
    };

    return `${base} ${variants[this.variant()]}`;
  }
}

import { Component, ElementRef, HostListener, computed, forwardRef, inject, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
}

@Component({
  selector: 'app-combobox',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ComboboxComponent), multi: true }],
  templateUrl: './combobox.html',
})
export class ComboboxComponent implements ControlValueAccessor {
  options = input<ComboboxOption[]>([]);
  placeholder = input('Search…');
  emptyText = input('No results');
  loading = input(false);
  /** When true, filters `options` internally by the typed text instead of emitting `search` for the parent to handle. */
  filterLocally = input(false);

  search = output<string>();

  protected readonly isOpen = signal(false);
  protected readonly queryText = signal('');
  protected readonly selectedValue = signal<string | null>(null);
  protected readonly isDisabled = signal(false);

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  protected readonly selectedOption = computed(() => this.options().find((o) => o.value === this.selectedValue()) ?? null);

  protected readonly displayValue = computed(() => (this.isOpen() ? this.queryText() : (this.selectedOption()?.label ?? '')));

  protected readonly visibleOptions = computed(() => {
    if (!this.filterLocally()) return this.options();

    const query = this.queryText().trim().toLowerCase();
    if (!query) return this.options();

    return this.options().filter(
      (o) => o.label.toLowerCase().includes(query) || o.sublabel?.toLowerCase().includes(query),
    );
  });

  writeValue(value: string | null): void {
    this.selectedValue.set(value);
    this.queryText.set('');
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  onInput(text: string): void {
    this.queryText.set(text);
    this.isOpen.set(true);
    this.search.emit(text);
  }

  open(): void {
    if (this.isDisabled()) return;
    this.isOpen.set(true);
    this.queryText.set('');
    this.search.emit('');
  }

  choose(option: ComboboxOption): void {
    this.selectedValue.set(option.value);
    this.onChange(option.value);
    this.queryText.set('');
    this.isOpen.set(false);
    this.onTouched();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.isOpen.set(false);
    }
  }
}

import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Output,
} from '@angular/core';

@Directive({
  selector: '[appCellInputEvents]',
  standalone: true,
})
export class CellInputEventsDirective {
  private el = inject(ElementRef<HTMLInputElement>);

  @Output() navigationKey = new EventEmitter<KeyboardEvent>();
  @Output() saveInput = new EventEmitter<void>();
  @Output() cancelInput = new EventEmitter<void>();

  private readonly verticalNavigationKeys = ['ArrowUp', 'ArrowDown', 'Home', 'End'];
  private readonly rightNavigationKeys = ['Tab', 'Enter', 'ArrowRight'];
  private readonly leftNavigationKeys = ['ArrowLeft', 'Backspace'];

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.verticalNavigationKeys.includes(event.key)) {
      this.saveInput.emit();
      this.navigationKey.emit(event);
      event.preventDefault();
      return;
    }

    if (this.rightNavigationKeys.includes(event.key)) {
      if (this.isCaretAtEnd()) {
        this.saveInput.emit();
        this.navigationKey.emit(event);
        event.preventDefault();
      }
      return;
    }

    if (this.leftNavigationKeys.includes(event.key)) {
      if (this.isCaretAtStart()) {
        this.saveInput.emit();
        this.navigationKey.emit(event);
        event.preventDefault();
      }
      return;
    }

    if (event.key === 'Escape') {
      this.cancelInput.emit();
      event.preventDefault();
    }
  }

  private isCaretAtEnd(): boolean {
    const input = this.el.nativeElement;
    return input.selectionStart === input.value.length;
  }

  private isCaretAtStart(): boolean {
    const input = this.el.nativeElement;
    return input.selectionStart === 0;
  }

  @HostListener('blur')
  onBlur(): void {
    this.saveInput.emit();
  }

  focus(): void {
    this.el.nativeElement.focus();
  }

  blur(): void {
    this.el.nativeElement.blur();
  }

  select(): void {
    this.el.nativeElement.select();
  }

  get value(): string {
    return this.el.nativeElement.value;
  }

  set value(val: string) {
    this.el.nativeElement.value = val;
  }
}

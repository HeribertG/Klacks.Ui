import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Output,
} from '@angular/core';

export interface CellInputRightClickEvent {
  clientX: number;
  clientY: number;
}

@Directive({
  selector: '[appCellInputEvents]',
  standalone: true,
})
export class CellInputEventsDirective {
  private el = inject(ElementRef<HTMLInputElement>);

  @Output() navigationKey = new EventEmitter<KeyboardEvent>();
  @Output() saveInput = new EventEmitter<void>();
  @Output() cancelInput = new EventEmitter<void>();
  @Output() rightClick = new EventEmitter<CellInputRightClickEvent>();

  private readonly verticalNavigationKeys = ['ArrowUp', 'ArrowDown', 'Home', 'End'];
  private readonly alwaysSaveKeys = ['Enter', 'Tab'];
  private readonly rightNavigationKeys = ['ArrowRight'];
  private readonly leftNavigationKeys = ['ArrowLeft', 'Backspace'];

  private saveEmittedByKey = false;

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.verticalNavigationKeys.includes(event.key)) {
      this.saveEmittedByKey = true;
      this.saveInput.emit();
      this.navigationKey.emit(event);
      event.preventDefault();
      return;
    }

    if (this.alwaysSaveKeys.includes(event.key)) {
      this.saveEmittedByKey = true;
      this.saveInput.emit();
      this.navigationKey.emit(event);
      event.preventDefault();
      return;
    }

    if (this.rightNavigationKeys.includes(event.key)) {
      if (this.isCaretAtEnd()) {
        this.saveEmittedByKey = true;
        this.saveInput.emit();
        this.navigationKey.emit(event);
        event.preventDefault();
      }
      return;
    }

    if (this.leftNavigationKeys.includes(event.key)) {
      if (this.isCaretAtStart()) {
        this.saveEmittedByKey = true;
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
    if (this.saveEmittedByKey) {
      this.saveEmittedByKey = false;
      return;
    }
    this.saveInput.emit();
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.rightClick.emit({
      clientX: event.clientX,
      clientY: event.clientY,
    });
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

  moveCursorToEnd(): void {
    const input = this.el.nativeElement;
    const len = input.value.length;
    input.setSelectionRange(len, len);
  }

  get value(): string {
    return this.el.nativeElement.value;
  }

  set value(val: string) {
    this.el.nativeElement.value = val;
  }
}

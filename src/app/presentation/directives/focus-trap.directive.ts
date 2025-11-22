import { Directive, ElementRef, OnInit, OnDestroy, AfterViewInit } from '@angular/core';

@Directive({
  selector: '[appFocusTrap]',
  standalone: true
})
export class FocusTrapDirective implements AfterViewInit, OnDestroy {
  private previousActiveElement: HTMLElement | null = null;
  private focusableElements: HTMLElement[] = [];
  private firstFocusableElement: HTMLElement | null = null;
  private lastFocusableElement: HTMLElement | null = null;
  private keydownListener: ((event: KeyboardEvent) => void) | null = null;

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    this.previousActiveElement = document.activeElement as HTMLElement;
    this.updateFocusableElements();
    this.trapFocus();

    if (this.firstFocusableElement) {
      setTimeout(() => {
        this.firstFocusableElement?.focus();
      }, 100);
    }
  }

  ngOnDestroy(): void {
    if (this.keydownListener) {
      this.elementRef.nativeElement.removeEventListener('keydown', this.keydownListener as EventListener);
    }

    if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
      setTimeout(() => {
        this.previousActiveElement?.focus();
      }, 0);
    }
  }

  private updateFocusableElements(): void {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ];

    this.focusableElements = Array.from(
      this.elementRef.nativeElement.querySelectorAll(focusableSelectors.join(','))
    ) as HTMLElement[];

    this.firstFocusableElement = this.focusableElements[0] || null;
    this.lastFocusableElement = this.focusableElements[this.focusableElements.length - 1] || null;
  }

  private trapFocus(): void {
    this.keydownListener = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return;
      }

      this.updateFocusableElements();

      if (event.shiftKey) {
        if (document.activeElement === this.firstFocusableElement) {
          event.preventDefault();
          this.lastFocusableElement?.focus();
        }
      } else {
        if (document.activeElement === this.lastFocusableElement) {
          event.preventDefault();
          this.firstFocusableElement?.focus();
        }
      }
    };

    this.elementRef.nativeElement.addEventListener('keydown', this.keydownListener as EventListener);
  }
}

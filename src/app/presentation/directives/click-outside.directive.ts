import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
} from '@angular/core';

/**
 * ClickOutsideDirective
 *
 * A standalone directive that detects clicks outside of the element it is applied to.
 * This directive is used by the context menu system to close menus when the user
 * clicks outside of them. It handles both regular clicks and right-clicks (context menu events).
 *
 * Features:
 * - Detects clicks outside the host element
 * - Emits an event when an outside click is detected
 * - Handles both left and right mouse clicks
 * - Prevents event propagation when needed
 */
@Directive({
  selector: '[appClickOutside]',
  standalone: true,
})
export class ClickOutsideDirective {
  @Output() clickOutside = new EventEmitter<MouseEvent>();

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  public onClick(event: MouseEvent): void {
    const targetElement = event.target as HTMLElement;

    const clickedInside = this.elementRef.nativeElement.contains(targetElement);

    if (!clickedInside) {
      this.clickOutside.emit(event);
    }
  }

  @HostListener('document:contextmenu', ['$event'])
  public onContextMenu(event: MouseEvent): void {
    const targetElement = event.target as HTMLElement;
    const clickedInside = this.elementRef.nativeElement.contains(targetElement);

    if (!clickedInside) {
      this.clickOutside.emit(event);
    }
  }
}

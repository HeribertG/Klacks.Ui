// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Directive, ElementRef, HostListener, inject, output } from '@angular/core';

@Directive({
  selector: '[appClickOutside]',
  standalone: true,
})
export class ClickOutsideDirective {
  private elementRef = inject(ElementRef);

  readonly clickOutside = output<MouseEvent>();

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
    if (event.defaultPrevented) return;

    const targetElement = event.target as HTMLElement;
    const clickedInside = this.elementRef.nativeElement.contains(targetElement);

    if (!clickedInside) {
      this.clickOutside.emit(event);
    }
  }
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Directive, ElementRef, OnDestroy, AfterViewInit, inject, output } from '@angular/core';

@Directive({
  selector: '[appResize]',
  standalone: true,
})
export class ResizeDirective implements AfterViewInit, OnDestroy {
  private elementRef = inject(ElementRef);

  readonly resizeElement = output<ResizeObserverEntry[]>();
  private appResizeObserver!: ResizeObserver;

  ngAfterViewInit() {
    this.appResizeObserver = new ResizeObserver((entries) => {
      this.resizeElement.emit(entries);
    });
    this.appResizeObserver.observe(this.elementRef.nativeElement);
  }

  ngOnDestroy() {
    if (this.appResizeObserver) {
      this.appResizeObserver.disconnect();
    }
  }
}

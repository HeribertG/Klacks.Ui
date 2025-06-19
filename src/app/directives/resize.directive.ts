import {
  Directive,
  ElementRef,
  Output,
  EventEmitter,
  OnDestroy,
  AfterViewInit,
} from '@angular/core';

@Directive({
  selector: '[appResize]',
  standalone: true,
})
export class ResizeDirective implements AfterViewInit, OnDestroy {
  @Output() resizeElement = new EventEmitter<ResizeObserverEntry[]>();
  private appResizeObserver!: ResizeObserver;

  constructor(private elementRef: ElementRef) {}

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

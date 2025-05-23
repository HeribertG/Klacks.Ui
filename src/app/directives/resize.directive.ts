import {
  Directive,
  ElementRef,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from '@angular/core';

@Directive({
  selector: '[appResize]',
  standalone: true,
})
export class ResizeDirective implements OnInit, OnDestroy {
  @Output() resizeElement = new EventEmitter<ResizeObserverEntry[]>();
  private appResizeObserver: ResizeObserver;

  constructor(private elementRef: ElementRef) {
    this.appResizeObserver = new ResizeObserver((entries) => {
      this.resizeElement.emit(entries);
    });
  }

  ngOnInit() {
    this.appResizeObserver.observe(this.elementRef.nativeElement);
  }

  ngOnDestroy() {
    this.appResizeObserver.disconnect();
  }
}

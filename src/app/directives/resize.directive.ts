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
    standalone: false
})
export class ResizeDirective implements OnInit, OnDestroy {
  @Output() resizeElement = new EventEmitter<ResizeObserverEntry[]>();
  private resizeObserver: ResizeObserver;

  constructor(private elementRef: ElementRef) {
    this.resizeObserver = new ResizeObserver((entries) => {
      this.resizeElement.emit(entries);
    });
  }

  ngOnInit() {
    this.resizeObserver.observe(this.elementRef.nativeElement);
  }

  ngOnDestroy() {
    this.resizeObserver.disconnect();
  }
}

import { Directive, ElementRef, inject, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[appInitContent]',
  standalone: true,
})
export class InitContentDirective implements OnInit, OnChanges {
  @Input() appInitContent: string | undefined;

  private el = inject(ElementRef);

  ngOnInit(): void {
    this.updateContent();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['appInitContent']) {
      this.updateContent();
    }
  }

  private updateContent(): void {
    const newContent = this.appInitContent !== undefined ? this.appInitContent : '';
    const currentContent = this.el.nativeElement.innerHTML;

    if (newContent !== currentContent) {
      this.el.nativeElement.innerHTML = newContent;
    }
  }
}

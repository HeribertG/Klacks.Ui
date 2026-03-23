// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Directive, ElementRef, inject, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import DOMPurify from 'dompurify';

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
    const rawContent = this.appInitContent !== undefined ? this.appInitContent : '';
    const newContent = DOMPurify.sanitize(rawContent);
    const currentContent = this.el.nativeElement.innerHTML;

    if (newContent !== currentContent) {
      this.el.nativeElement.innerHTML = newContent;
    }
  }
}

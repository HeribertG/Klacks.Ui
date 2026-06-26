// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Directive, ElementRef, inject, effect, input } from '@angular/core';
import DOMPurify from 'dompurify';

@Directive({
  selector: '[appInitContent]',
  standalone: true,
})
export class InitContentDirective {
  readonly appInitContent = input<string>();

  private el = inject(ElementRef);

  constructor() {
    effect(() => {
      this.updateContent();
    });
  }

  private updateContent(): void {
    const appInitContent = this.appInitContent();
    const rawContent = appInitContent !== undefined ? appInitContent : '';
    const newContent = DOMPurify.sanitize(rawContent);
    const currentContent = this.el.nativeElement.innerHTML;

    if (newContent !== currentContent) {
      this.el.nativeElement.innerHTML = newContent;
    }
  }
}

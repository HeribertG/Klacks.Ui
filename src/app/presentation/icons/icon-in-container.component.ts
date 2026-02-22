// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-in-container',
  styleUrls: ['./icon.scss'],
  template: `<span [innerHTML]="svgContent"></span>`,
  standalone: true,
})
export class IconInContainerComponent {
  static getSvg(color: string): string {
    return `
      <svg width="10" height="10" viewBox="0 0 10 10"
           xmlns="http://www.w3.org/2000/svg"
           fill="none" stroke="${color}"
           stroke-width="1" stroke-linecap="round">
        <rect x="0.5" y="0.5" width="9" height="9" />
        <path d="M5 2.5 V6.5" />
        <path d="M4 5.5 L5 6.5 L6 5.5" />
      </svg>`;
  }

  svgContent: SafeHtml;
  private sanitizer = inject(DomSanitizer);

  constructor() {
    this.svgContent = this.sanitizer.bypassSecurityTrustHtml(
      IconInContainerComponent.getSvg('var(--iconStandartColor)')
    );
  }
}

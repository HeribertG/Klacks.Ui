// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Pencil icon for indicating editable/overridden cells in grid rendering.
 * @param color - Stroke/fill color for the SVG path (passed via getSvg)
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-pencil',
  styleUrls: ['./icon.scss'],
  template: `<span [innerHTML]="svgContent"></span>`,
  standalone: true,
})
export class IconPencilComponent {
  static getSvg(color: string): string {
    return `
      <svg width="10" height="10" viewBox="0 0 10 10"
           xmlns="http://www.w3.org/2000/svg"
           fill="none" stroke="${color}"
           stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 9 L1 7.5 L6.5 2 L8 3.5 L2.5 9 Z" />
        <path d="M6 2.5 L7.5 1 L9 2.5 L7.5 4" />
        <path d="M1 9 L2.5 9" />
      </svg>`;
  }

  svgContent: SafeHtml;
  private sanitizer = inject(DomSanitizer);

  constructor() {
    this.svgContent = this.sanitizer.bypassSecurityTrustHtml(
      IconPencilComponent.getSvg('var(--iconStandartColor)')
    );
  }
}

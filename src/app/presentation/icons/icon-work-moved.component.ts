// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Two opposed arrows drawn on a work cell that was taken over from another person (cover move).
 * @param color - Fill/stroke color of the SVG (passed via getSvg; the grid canvas cannot resolve CSS variables)
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-work-moved',
  styleUrls: ['./icon.scss'],
  template: `<span [innerHTML]="svgContent"></span>`,
  standalone: true,
})
export class IconWorkMovedComponent {
  static getSvg(color: string): string {
    return `
      <svg width="12" height="12" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <g fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5h10M9 2l3 3-3 3"/><path d="M14 11H4M7 8l-3 3 3 3"/></g>
      </svg>`;
  }

  svgContent: SafeHtml;
  private sanitizer = inject(DomSanitizer);

  constructor() {
    this.svgContent = this.sanitizer.bypassSecurityTrustHtml(
      IconWorkMovedComponent.getSvg('var(--iconStandartColor)')
    );
  }
}

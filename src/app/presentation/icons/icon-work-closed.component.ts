// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Padlock drawn on a closed work cell in the schedule grid.
 * @param color - Fill/stroke color of the SVG (passed via getSvg; the grid canvas cannot resolve CSS variables)
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-work-closed',
  styleUrls: ['./icon.scss'],
  template: `<span [innerHTML]="svgContent"></span>`,
  standalone: true,
})
export class IconWorkClosedComponent {
  static getSvg(color: string): string {
    return `
      <svg width="12" height="12" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4v2h-.25A1.75 1.75 0 002 7.75v5.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 13.25v-5.5A1.75 1.75 0 0012.25 6H12V4a4 4 0 10-8 0zm6.5 2V4a2.5 2.5 0 00-5 0v2zM12.25 7.5a.25.25 0 01.25.25v5.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-5.5a.25.25 0 01.25-.25z" fill="${color}"/>
      </svg>`;
  }

  svgContent: SafeHtml;
  private sanitizer = inject(DomSanitizer);

  constructor() {
    this.svgContent = this.sanitizer.bypassSecurityTrustHtml(
      IconWorkClosedComponent.getSvg('var(--iconStandartColor)')
    );
  }
}

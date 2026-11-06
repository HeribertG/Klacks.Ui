// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Verified badge drawn on an approved work cell in the schedule grid.
 * @param color - Fill/stroke color of the SVG (passed via getSvg; the grid canvas cannot resolve CSS variables)
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-work-approved',
  styleUrls: ['./icon.scss'],
  template: `<span [innerHTML]="svgContent"></span>`,
  standalone: true,
})
export class IconWorkApprovedComponent {
  static getSvg(color: string): string {
    return `
      <svg width="12" height="12" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <path d="M9.585.52a2.678 2.678 0 00-3.17 0l-.928.68a1.178 1.178 0 01-.518.215L3.83 1.59a2.678 2.678 0 00-2.24 2.24l-.175 1.14a1.178 1.178 0 01-.215.518l-.68.928a2.678 2.678 0 000 3.17l.68.928c.113.153.186.33.215.518l.175 1.138a2.678 2.678 0 002.24 2.24l1.138.175c.187.029.365.102.518.215l.928.68a2.678 2.678 0 003.17 0l.928-.68a1.17 1.17 0 01.518-.215l1.138-.175a2.678 2.678 0 002.241-2.24l.175-1.138c.029-.187.102-.365.215-.518l.68-.928a2.678 2.678 0 000-3.17l-.68-.928a1.179 1.179 0 01-.215-.518L14.41 3.83a2.678 2.678 0 00-2.24-2.24l-1.138-.175a1.179 1.179 0 01-.518-.215zM7.303 1.728c.531-.39 1.253-.39 1.784 0l.842.617.168.048 1.032.159c.7.108 1.248.657 1.356 1.357l.159 1.032.048.168.617.842c.39.531.39 1.253 0 1.784l-.617.842-.048.168-.159 1.032a1.678 1.678 0 01-1.356 1.357l-1.032.159-.168.048-.842.617c-.531.39-1.253.39-1.784 0l-.842-.617-.168-.048-1.032-.159a1.678 1.678 0 01-1.357-1.357l-.159-1.032-.048-.168-.617-.842a1.678 1.678 0 010-1.784l.617-.842.048-.168.159-1.032a1.678 1.678 0 011.357-1.357l1.032-.159.168-.048zm3.475 3.494a.75.75 0 00-1.06-1.06L7 6.88 5.78 5.66a.75.75 0 00-1.06 1.06l1.75 1.75a.75.75 0 001.06 0z" fill="${color}"/>
      </svg>`;
  }

  svgContent: SafeHtml;
  private sanitizer = inject(DomSanitizer);

  constructor() {
    this.svgContent = this.sanitizer.bypassSecurityTrustHtml(
      IconWorkApprovedComponent.getSvg('var(--iconStandartColor)')
    );
  }
}

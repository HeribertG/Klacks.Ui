// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Read-only A4 print preview for a floor plan SVG, with a scrollable viewport.
 * @param svgContent - Raw SVG string from Fabric.js toSVG()
 * @param zoom - Zoom factor (1 = 100%, 1.5 = 150%); scales page size so scrollbars appear when large
 * @param orientation - 'landscape' (default, 297×210 mm) or 'portrait' (210×297 mm)
 */

import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

type PrintOrientation = 'landscape' | 'portrait';

const A4_LANDSCAPE_WIDTH_PX = 1123;
const A4_LANDSCAPE_HEIGHT_PX = 794;

@Component({
  selector: 'lib-floor-plan-print-preview',
  standalone: true,
  imports: [],
  templateUrl: './floor-plan-print-preview.component.html',
  styleUrls: ['./floor-plan-print-preview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlanPrintPreviewComponent {
  readonly svgContent = input.required<string>();
  readonly zoom = input<number>(1);
  readonly orientation = input<PrintOrientation>('landscape');

  readonly svgDataUrl = computed<string>(() =>
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(this.svgContent())}`,
  );

  readonly pageWidth = computed<number>(() => {
    const base =
      this.orientation() === 'landscape' ? A4_LANDSCAPE_WIDTH_PX : A4_LANDSCAPE_HEIGHT_PX;
    return Math.round(base * this.zoom());
  });

  readonly pageHeight = computed<number>(() => {
    const base =
      this.orientation() === 'landscape' ? A4_LANDSCAPE_HEIGHT_PX : A4_LANDSCAPE_WIDTH_PX;
    return Math.round(base * this.zoom());
  });
}

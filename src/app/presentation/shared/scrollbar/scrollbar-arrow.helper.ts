// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Picks the triangle glyphs of the backward and forward arrow buttons for an axis.
 * @param axis - Axis configuration providing the backward/forward glyph of the orientation
 * @param service - ScrollbarService holding the triangle SVG markup
 * @param swap - True in a right-to-left horizontal scrollbar, where the backward button points right
 */
import { AxisConfig } from './axis-config.interface';
import { ScrollbarService } from './scrollbar.service';

export function arrowSvgs(
  axis: AxisConfig,
  service: ScrollbarService,
  swap: boolean
): { backward: string; forward: string } {
  return {
    backward: swap ? axis.svgForward(service) : axis.svgBackward(service),
    forward: swap ? axis.svgBackward(service) : axis.svgForward(service),
  };
}

// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Axis-specific property names, arrow glyphs, thumb factory and resize extraction for the vertical and the
 * horizontal scrollbar.
 */
import { AxisConfig } from './axis-config.interface';

export const VERTICAL_AXIS_CONFIG: AxisConfig = {
  clientPos: 'clientY',
  canvasOffset: 'offsetTop',
  canvasSizeProp: 'height',
  canvasCrossSizeProp: 'width',
  thumbSizeProp: 'height',
  svgBackward: (svc) => svc.triangleTopSvg,
  svgForward: (svc) => svc.triangleBottomSvg,
  createThumbFn: (service, metrics, images) => service.createThumbVertical(metrics, images),
  metricsSize: (canvas) => Math.round(canvas.height),
  resizeExtract: (entry, padding) => ({
    width: entry.contentRect.width,
    height: entry.contentRect.height - padding,
  }),
};

export const HORIZONTAL_AXIS_CONFIG: AxisConfig = {
  clientPos: 'clientX',
  canvasOffset: 'offsetLeft',
  canvasSizeProp: 'width',
  canvasCrossSizeProp: 'height',
  thumbSizeProp: 'width',
  svgBackward: (svc) => svc.triangleLeftSvg,
  svgForward: (svc) => svc.triangleRightSvg,
  createThumbFn: (service, metrics, images) => service.createThumbHorizontal(metrics, images),
  metricsSize: (canvas) => canvas.width,
  resizeExtract: (entry, padding) => ({
    width: entry.contentRect.width - padding,
  }),
};

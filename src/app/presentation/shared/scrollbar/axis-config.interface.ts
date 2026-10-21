// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ScrollbarService } from './scrollbar.service';
import { IMetrics } from './metrics.interface';
import { IImagesThumps } from './images-thumps.interface';

export interface AxisConfig {
  clientPos: 'clientX' | 'clientY';
  canvasOffset: 'offsetLeft' | 'offsetTop';
  canvasSizeProp: 'width' | 'height';
  canvasCrossSizeProp: 'width' | 'height';
  thumbSizeProp: 'width' | 'height';
  svgBackward: (service: ScrollbarService) => string;
  svgForward: (service: ScrollbarService) => string;
  createThumbFn: (service: ScrollbarService, metrics: IMetrics, images: IImagesThumps) => void;
  metricsSize: (canvas: HTMLCanvasElement) => number;
  resizeExtract: (entry: ResizeObserverEntry, padding: number) => { width: number; height?: number };
}

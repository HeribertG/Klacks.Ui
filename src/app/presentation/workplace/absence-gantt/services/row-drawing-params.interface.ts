// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { jsPDF } from 'jspdf';
import { GanttDrawingConfig } from './gantt-drawing-config.interface';

export interface RowDrawingParams {
  x: number;
  y: number;
  pdf: jsPDF;
  config: GanttDrawingConfig;
}

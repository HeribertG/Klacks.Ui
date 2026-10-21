// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Constants of the report-row editor: toast channel, fallback source and data set, margin bounds,
 * the preview filters each data source needs, and the options of the edit modal.
 */

import { NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { ReportMargins } from 'src/app/domain/models/report/report-margins.interface';
import { SourcePreviewConfig } from './source-preview-config.interface';

export const REPORT_TOAST_NAME = 'report-template';
export const DEFAULT_SOURCE_ID = 'schedule';
export const DEFAULT_DATA_SET_ID = 'work';
export const MARGIN_MIN = 0;
export const MARGIN_MAX = 60;
export const MARGIN_SIDES: readonly (keyof ReportMargins)[] = ['top', 'bottom', 'left', 'right'];
export const REPORT_MANUAL_NAME = 'report-manual';
export const MODAL_DISMISS_REASON = 'Cancel click';
export const PREVIEW_TAB_TARGET = '_blank';

export const REPORT_MODAL_OPTIONS: Readonly<NgbModalOptions> = {
  size: 'xl',
  backdrop: 'static',
  keyboard: false,
};

export const SOURCE_PREVIEW_CONFIGS: Readonly<Record<string, SourcePreviewConfig>> = {
  schedule: { needsGroup: false, needsDateRange: true, needsClient: false },
  'absence-gantt': { needsGroup: false, needsDateRange: true, needsClient: true },
  'all-address': { needsGroup: false, needsDateRange: false, needsClient: false },
  'edit-address': { needsGroup: false, needsDateRange: false, needsClient: false },
  group: { needsGroup: false, needsDateRange: false, needsClient: false },
  'shift-table': { needsGroup: false, needsDateRange: false, needsClient: false },
  'container-template': { needsGroup: false, needsDateRange: false, needsClient: false },
  'client-availability': { needsGroup: false, needsDateRange: true, needsClient: false },
  'edit-client-availability': { needsGroup: false, needsDateRange: true, needsClient: true },
};

export const FALLBACK_PREVIEW_CONFIG: SourcePreviewConfig = { needsGroup: false, needsDateRange: true, needsClient: false };

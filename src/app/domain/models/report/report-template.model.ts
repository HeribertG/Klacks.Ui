// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ReportSection } from './report-section.model';
import { ReportParameter } from './report-parameter.model';

export interface ReportTemplate {
  id?: string;
  name: string;
  description: string;
  type: ReportType;
  sourceId?: string;
  dataSetIds?: string[];
  pageSetup: ReportPageSetup;
  sections: ReportSection[];
  mergeRows?: boolean;
  showFullPeriod?: boolean;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  isLocal?: boolean;
  versions?: ReportTemplateVersion[];
  parameters?: ReportParameter[];
}

/** Snapshot of a template taken before it was overwritten. */
export interface ReportTemplateVersion {
  savedAt: string;
  savedBy?: string;
  name: string;
  pageSetup: ReportPageSetup;
  sections: ReportSection[];
}

export enum ReportType {
  Schedule = 0,
  Client = 1,
  Invoice = 2,
  Absence = 3
}

export interface ReportPageSetup {
  orientation: ReportOrientation;
  size: ReportPageSize;
  margins: ReportMargins;
}

export enum ReportOrientation {
  Portrait = 0,
  Landscape = 1
}

export enum ReportPageSize {
  A4 = 0,
  A3 = 1,
  Letter = 2,
  B4 = 3,
  B5 = 4
}

export const PAGE_SIZE_FORMATS: Record<ReportPageSize, string | [number, number]> = {
  [ReportPageSize.A4]: 'a4',
  [ReportPageSize.A3]: 'a3',
  [ReportPageSize.Letter]: 'letter',
  [ReportPageSize.B4]: [250, 353],
  [ReportPageSize.B5]: [176, 250],
};

/** Portrait dimensions in millimetres, width first. */
export const PAGE_SIZE_DIMENSIONS: Record<ReportPageSize, [number, number]> = {
  [ReportPageSize.A4]: [210, 297],
  [ReportPageSize.A3]: [297, 420],
  [ReportPageSize.Letter]: [215.9, 279.4],
  [ReportPageSize.B4]: [250, 353],
  [ReportPageSize.B5]: [176, 250],
};

export const PAGE_SIZE_LABELS: Record<ReportPageSize, string> = {
  [ReportPageSize.A4]: 'A4',
  [ReportPageSize.A3]: 'A3',
  [ReportPageSize.Letter]: 'Letter',
  [ReportPageSize.B4]: 'B4 (JIS)',
  [ReportPageSize.B5]: 'B5 (JIS)',
};

export interface PageGeometry {
  label: string;
  widthMm: number;
  heightMm: number;
  usableWidthMm: number;
}

/**
 * Resolves the printable geometry of a page setup, taking orientation and margins into account.
 */
export function resolvePageGeometry(pageSetup: ReportPageSetup | undefined): PageGeometry {
  const size = pageSetup?.size ?? ReportPageSize.A4;
  const margins = pageSetup?.margins ?? DEFAULT_PAGE_SETUP.margins;
  const [portraitWidth, portraitHeight] = PAGE_SIZE_DIMENSIONS[size] ?? PAGE_SIZE_DIMENSIONS[ReportPageSize.A4];
  const isLandscape = (pageSetup?.orientation ?? ReportOrientation.Landscape) === ReportOrientation.Landscape;

  const widthMm = isLandscape ? portraitHeight : portraitWidth;
  const heightMm = isLandscape ? portraitWidth : portraitHeight;

  return {
    label: PAGE_SIZE_LABELS[size] ?? PAGE_SIZE_LABELS[ReportPageSize.A4],
    widthMm,
    heightMm,
    usableWidthMm: Math.max(0, widthMm - margins.left - margins.right),
  };
}

export interface ReportMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export const DEFAULT_PAGE_SETUP: ReportPageSetup = {
  orientation: ReportOrientation.Landscape,
  size: ReportPageSize.A4,
  margins: { top: 20, bottom: 20, left: 20, right: 20 }
};

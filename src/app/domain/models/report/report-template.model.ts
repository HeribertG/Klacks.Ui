// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ReportSection } from './report-section.model';

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

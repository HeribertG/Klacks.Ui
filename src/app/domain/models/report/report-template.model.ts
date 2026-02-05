export interface ReportTemplate {
  id?: string;
  name: string;
  description: string;
  type: ReportType;
  pageSetup: ReportPageSetup;
  sections: ReportSection[];
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
  Letter = 2
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

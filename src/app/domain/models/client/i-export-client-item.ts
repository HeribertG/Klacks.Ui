// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IExportClientItem {
  idNumber: number;
  company: string;
  firstName: string;
  name: string;
  birthdate: string | undefined;
  gender: number;
  type: number;
  legalEntity: boolean;
}

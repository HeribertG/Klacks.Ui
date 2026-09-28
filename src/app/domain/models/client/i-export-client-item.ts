// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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

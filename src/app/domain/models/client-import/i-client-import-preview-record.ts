// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IClientImportPreviewRecord {
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  gender: string | null;
  birthdate: string | null;
  street: string | null;
  addressLine2: string | null;
  zip: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  entryDate: string;
  exitDate: string | null;
  contractName: string | null;
  groupName: string | null;
  note: string | null;
}

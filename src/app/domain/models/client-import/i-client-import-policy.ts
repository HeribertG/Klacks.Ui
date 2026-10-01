// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import {
  ClientImportDuplicateHandling,
  ClientImportEmailType,
  ClientImportFormerEmployeesHandling,
  ClientImportMobileType,
  ClientImportPhoneType,
} from 'src/app/domain/enums/client-import.enums';

export interface IClientImportPolicy {
  contractId: string | null;
  groupId: string | null;
  entryDate: string | null;
  defaultCountry: string | null;
  emailType: ClientImportEmailType;
  phoneType: ClientImportPhoneType;
  mobileType: ClientImportMobileType;
  formerEmployees: ClientImportFormerEmployeesHandling;
  duplicates: ClientImportDuplicateHandling;
}

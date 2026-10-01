// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ClientImportGender } from 'src/app/domain/enums/client-import.enums';

export interface IClientImportRowOverride {
  rowIndex: number;
  skip: boolean | null;
  gender: ClientImportGender | null;
  createDuplicate: boolean | null;
}

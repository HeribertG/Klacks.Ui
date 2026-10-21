// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface NavFilterFormModel {
  female: boolean;
  male: boolean;
  intersexuality: boolean;
  legalEntity: boolean;
  employee: boolean;
  externEmp: boolean;
  customer: boolean;
  activeMembership: boolean;
  formerMembership: boolean;
  futureMembership: boolean;
  scopeFromFlag: boolean;
  scopeUntilFlag: boolean;
  showDeleteEntries: boolean;
}

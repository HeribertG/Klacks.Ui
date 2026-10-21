// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface EditGroupNavFilterModel {
  female: boolean;
  male: boolean;
  legalEntity: boolean;
  activeMembership: boolean;
  formerMembership: boolean;
  futureMembership: boolean;
  scopeFromFlag: boolean;
  scopeUntilFlag: boolean;
}

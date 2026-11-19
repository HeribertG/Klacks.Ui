// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { UserRightsLevel } from 'src/app/domain/constants/user-rights-level.constants';

export interface UserRightsModel {
  rights: UserRightsLevel;
}

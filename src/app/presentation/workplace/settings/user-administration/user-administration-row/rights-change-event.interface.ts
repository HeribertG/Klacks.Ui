// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { UserRightsLevel } from 'src/app/domain/constants/user-rights-level.constants';
import { IAuthentication } from 'src/app/domain/models/authentication.interface';

export interface RightsChangeEvent {
  account: IAuthentication;
  level: UserRightsLevel;
}

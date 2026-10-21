// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IAuthentication } from 'src/app/domain/models/authentication.interface';

export interface RoleChangeEvent {
  account: IAuthentication;
  roleName: 'Admin' | 'Authorised';
  isSelected: boolean;
}

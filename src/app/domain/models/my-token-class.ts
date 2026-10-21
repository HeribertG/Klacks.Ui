// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IMyToken } from './my-token.interface';

export class MyToken implements IMyToken {
  success = false;
  token = '';
  subject = '';
  errorMessage = '';
  expTime = new Date();
  username = '';
  firstName = '';
  name = '';
  id = '';
  isAdmin = false;
  isAuthorised = false;
  permissions: string[] = [];
  refreshToken = '';
  version = '';
}

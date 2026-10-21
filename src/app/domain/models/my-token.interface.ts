// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IMyToken {
  success: boolean;
  token: string;
  subject: string;
  errorMessage: string;
  expTime: Date;
  username: string;
  firstName: string;
  name: string;
  id: string;
  isAdmin: boolean;
  isAuthorised: boolean;
  permissions: string[];
  refreshToken: string;
  version: string;
}

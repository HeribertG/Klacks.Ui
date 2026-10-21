// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IResponseAuthentication {
  expires: Date | undefined;
  isAdmin: boolean;
  isAuthorised: boolean;
  success: boolean;
}

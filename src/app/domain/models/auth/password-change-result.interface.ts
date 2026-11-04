// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IPasswordChangeResult {
  success: boolean;
  mailSuccess: boolean;
  token: string;
  refreshToken: string;
  expires: string;
}

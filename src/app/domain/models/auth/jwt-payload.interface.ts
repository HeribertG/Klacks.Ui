// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IJwtPayload {
  exp?: number;
  sub?: string;
  userId?: string;
  name?: string;
  userName?: string;
  roles?: string | string[];
  permissions?: string | string[];
}

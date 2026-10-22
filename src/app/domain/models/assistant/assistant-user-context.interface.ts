// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IAssistantUserContext {
  userId?: string;
  userName?: string;
  roles: string | string[];
  permissions: string | string[];
}

// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ICreateAgentRequest {
  name: string;
  displayName?: string;
  description?: string;
}

export interface IUpdateAgentRequest {
  name?: string;
  displayName?: string;
  description?: string;
  isActive?: boolean;
}

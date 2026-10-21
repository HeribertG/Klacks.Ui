// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface HarmonizerRequest {
  periodFrom: string;
  periodUntil: string;
  agentIds: string[];
  analyseToken?: string | null;
}

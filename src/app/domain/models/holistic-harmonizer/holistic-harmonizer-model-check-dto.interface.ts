// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface HolisticHarmonizerModelCheckDto {
  modelId: string;
  displayName: string;
  providerId: string;
  isHealthy: boolean;
  latencyMs: number;
  error: string | null;
}

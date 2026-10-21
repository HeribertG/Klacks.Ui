// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IKlacksyModelCheckDto {
  modelId: string;
  displayName: string;
  providerId: string;
  isHealthy: boolean;
  supportsToolCalling: boolean;
  latencyMs: number;
  contextWindow: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  qualifies: boolean;
  isEnabled: boolean;
  isDefault: boolean;
  error: string | null;
}

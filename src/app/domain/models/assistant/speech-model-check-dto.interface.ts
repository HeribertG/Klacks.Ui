// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ISpeechModelCheckDto {
  modelId: string;
  displayName: string;
  providerId: string;
  isHealthy: boolean;
  latencyMs: number;
  contextWindow: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  error: string | null;
}

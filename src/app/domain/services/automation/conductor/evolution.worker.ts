// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/// <reference lib="webworker" />

import {
  CoreShift,
  CoreAgent,
  CoreConfig,
  CorePenaltyWeights,
  runEvolution
} from './evolution-core';

interface WorkerInput {
  shifts: CoreShift[];
  agents: CoreAgent[];
  config: CoreConfig;
  penaltyWeights: CorePenaltyWeights;
}

function isWorkerInput(data: unknown): data is WorkerInput {
  if (data === null || typeof data !== 'object') {
    return false;
  }
  const input = data as Partial<WorkerInput>;
  return (
    Array.isArray(input.shifts) &&
    Array.isArray(input.agents) &&
    input.config !== null &&
    typeof input.config === 'object' &&
    input.penaltyWeights !== null &&
    typeof input.penaltyWeights === 'object'
  );
}

addEventListener('message', ({ data }: MessageEvent<unknown>) => {
  if (!isWorkerInput(data)) {
    return;
  }

  runEvolution(data.shifts, data.agents, data.config, data.penaltyWeights, {
    onProgress: (progressData) => {
      self.postMessage({ type: 'progress', data: progressData });
    },
    onResult: (resultData) => {
      self.postMessage({ type: 'result', data: resultData });
    }
  });
});

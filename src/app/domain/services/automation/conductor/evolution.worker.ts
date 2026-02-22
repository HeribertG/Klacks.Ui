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

addEventListener('message', ({ data }: MessageEvent<WorkerInput>) => {
  runEvolution(data.shifts, data.agents, data.config, data.penaltyWeights, {
    onProgress: (progressData) => {
      self.postMessage({ type: 'progress', data: progressData });
    },
    onResult: (resultData) => {
      self.postMessage({ type: 'result', data: resultData });
    }
  });
});

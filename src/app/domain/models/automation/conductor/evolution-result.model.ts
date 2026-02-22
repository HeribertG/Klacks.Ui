// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ISchedulingScenario } from './scheduling-scenario.model';
import { IEvolutionProgress } from './evolution-progress.model';

export interface IEvolutionResult {
  bestScenario: ISchedulingScenario;
  finalGeneration: number;
  totalGenerations: number;
  progress: IEvolutionProgress;
  success: boolean;
  message: string;
}

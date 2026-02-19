import { IEvolutionConfig } from './evolution-config.model';
import { IPenaltyWeights } from './penalty-weights.model';
import { IEvolutionProgress } from './evolution-progress.model';

export interface IConductorOptions {
  evolutionConfig?: Partial<IEvolutionConfig>;
  penaltyWeights?: Partial<IPenaltyWeights>;
  onProgress?: (progress: IEvolutionProgress) => void;
  cancellationToken?: { isCancelled: boolean };
  useWorker?: boolean;
}

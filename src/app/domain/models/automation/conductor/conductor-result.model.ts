import { IAssignmentResult } from './assignment-result.model';

export interface IConductorResult {
  success: boolean;
  assignments: IAssignmentResult[];
  unassignedShifts: string[];
  coverage: number;
  avgMotivation: number;
  generations: number;
  message: string;
  stopReason?: string;
  timeElapsedMs?: number;
  penaltyScore?: number;
  hardViolations?: number;
}

import { ShiftDatePair } from './shift-date-pair.dto';

export interface BulkWorksResponse {
  successCount: number;
  failedCount: number;
  createdIds: string[];
  deletedIds: string[];
  affectedShifts: ShiftDatePair[];
  periodHours?: Record<string, { hours: number; surcharges: number; guaranteedHours: number }>;
}

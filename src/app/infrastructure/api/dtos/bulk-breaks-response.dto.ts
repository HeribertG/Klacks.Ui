import { IPeriodHours } from 'src/app/domain/models/work-schedule-class';

export interface BulkBreaksResponse {
  successCount: number;
  failedCount: number;
  createdIds: string[];
  deletedIds: string[];
  periodHours?: Record<string, IPeriodHours>;
}

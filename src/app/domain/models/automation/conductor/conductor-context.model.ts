import { IShift } from './shift.model';
import { IScheduleAgent } from '../agent/schedule-agent.model';

export interface IConductorContext {
  startDate: Date;
  endDate: Date;
  shifts: IShift[];
  agents: IScheduleAgent[];
}

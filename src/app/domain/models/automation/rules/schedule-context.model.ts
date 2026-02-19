import { IShiftAssignment } from './shift-assignment.model';
import { IWorkQuant } from './work-quant.model';

export interface IScheduleContext {
  agentId: string;
  currentDate: Date;
  proposedAssignment: IShiftAssignment;
  existingAssignments: IShiftAssignment[];
  workQuants: IWorkQuant[];
}

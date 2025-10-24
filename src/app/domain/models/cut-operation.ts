import { IShift } from './shift-class';

export interface CutOperation {
  type: 'CREATE' | 'UPDATE';
  parentId: string;
  data: IShift;
}

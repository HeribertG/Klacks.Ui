export interface IDayApproval {
  id: string;
  approvalDate: string;
  groupId: string;
  approvedBy: string;
  approvedAt: string;
}

export class DayApproval implements IDayApproval {
  id = '';
  approvalDate = '';
  groupId = '';
  approvedBy = '';
  approvedAt = '';
}

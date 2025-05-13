export interface IAssignedGroup {
  id?: string;
  clientId: string;
  groupId: string;
  groupName: string;
}

export class AssignedGroup implements IAssignedGroup {
  iid?: string = undefined;
  clientId = '';
  groupId = '';
  groupName = '';
  id?: string;
}

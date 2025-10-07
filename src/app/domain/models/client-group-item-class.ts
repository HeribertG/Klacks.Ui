import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';

export interface IClientGroupItem {
  groupId?: string;
  clientId?: string;
  groupName?: string;
  description?: string;
  validFrom?: Date;
  validUntil?: Date;
  internalValidFrom?: NgbDateStruct;
  internalValidUntil?: NgbDateStruct;
}

export class ClientGroupItem implements IClientGroupItem {
  groupId?: string;
  clientId?: string;
  groupName?: string;
  description?: string;
  validFrom?: Date;
  validUntil?: Date;
  internalValidFrom?: NgbDateStruct;
  internalValidUntil?: NgbDateStruct;
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IClientGroupItem {
  groupId?: string;
  clientId?: string;
  groupName?: string;
  description?: string;
  validFrom?: Date;
  validUntil?: Date;
}

export class ClientGroupItem implements IClientGroupItem {
  groupId?: string;
  clientId?: string;
  groupName?: string;
  description?: string;
  validFrom?: Date;
  validUntil?: Date;
}

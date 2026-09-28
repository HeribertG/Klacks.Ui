// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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

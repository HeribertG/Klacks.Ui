// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { EmailGroupNodeType } from './email-group-node-type.enum';

export interface IEmailGroupNode {
  id: string;
  name: string;
  type: EmailGroupNodeType;
  emailCount: number;
  unreadCount: number;
  children: IEmailGroupNode[];
}

// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IEmailGroupNode {
  id: string;
  name: string;
  type: 'group' | 'client';
  emailCount: number;
  unreadCount: number;
  children: IEmailGroupNode[];
}

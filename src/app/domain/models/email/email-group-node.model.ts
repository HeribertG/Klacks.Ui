// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IEmailGroupNode {
  id: string;
  name: string;
  type: 'group' | 'client';
  emailCount: number;
  unreadCount: number;
  children: IEmailGroupNode[];
}

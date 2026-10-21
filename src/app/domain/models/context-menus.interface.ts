// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IContextMenu } from './context-menu.interface';

export interface IContextMenus {
  key: string;
  list: IContextMenu[];
}

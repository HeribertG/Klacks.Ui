// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IContextMenus } from './context-menus.interface';
import { IContextMenu } from './context-menu.interface';

export class ContextMenus implements IContextMenus {
  key = '';
  list: IContextMenu[] = [];
}

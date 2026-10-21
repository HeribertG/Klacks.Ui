// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IContextMenu } from './context-menu.interface';

export class ContextMenu implements IContextMenu {
  key = '';
  name = '';
  icon = '';
  hasSeparator = false;
  hasSubMenu = false;
}

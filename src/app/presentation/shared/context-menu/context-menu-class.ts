// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IMenu } from './menu.interface';
import { MenuItem } from './menu-item-class';

export class Menu implements IMenu {
  list: MenuItem[] = [];
}

// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Menu } from './context-menu-class';

export interface IMenuItem {
  key: string;
  name: string;
  subText: string | undefined;
  isSeparator: boolean;
  shortCut: string;
  iconFont: string;
  svgIcon: string | undefined;
  hasMenu: boolean;
  menu: Menu | undefined;
  disabled: boolean;
  valueKey: string;
  color: string | undefined;
}

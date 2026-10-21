// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Entry of a context menu (label, shortcut, icon, separator flag, optional sub-menu).
 * @param key - Identifier of the menu action
 * @param name - Display label
 * @param isSeparator - True when the entry only draws a separator line
 * @param shortCut - Keyboard shortcut shown next to the label
 * @param iconFont - Icon font class of the entry
 */

import { IMenuItem } from './menu-item.interface';
import { Menu } from './context-menu-class';

export class MenuItem implements IMenuItem {
  constructor(
    key: string,
    name: string,
    isSeparator: boolean,
    shortCut = '',
    iconFont = ''
  ) {
    this.key = key;
    this.name = name;
    this.isSeparator = isSeparator;
    this.shortCut = shortCut;
    this.iconFont = iconFont;
  }
  key = '';
  name = '';
  subText: string | undefined = undefined;
  isSeparator = false;
  shortCut = '';
  iconFont = '';
  svgIcon: string | undefined = undefined;
  hasMenu = false;
  menu: Menu | undefined = undefined;
  disabled = false;
  valueKey = '';
  color: string | undefined = undefined;
}

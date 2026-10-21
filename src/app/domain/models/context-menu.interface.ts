// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IContextMenu {
  key: string;
  name: string;
  icon: string;
  hasSeparator: boolean;
  hasSubMenu: boolean;
}

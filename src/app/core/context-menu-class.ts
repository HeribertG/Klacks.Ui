export interface IContextMenu {
  key: string;
  name: string;
  icon: string;
  hasSeparator: boolean;
  hasSubMenu: boolean;
}

export interface IContextMenus {
  key: string;
  list: IContextMenu[];
}

export class ContextMenu implements IContextMenu {
  key = '';
  name = '';
  icon = '';
  hasSeparator = false;
  hasSubMenu = false;
}
export class ContextMenus implements IContextMenus {
  key = '';
  list: IContextMenu[] = [];
}

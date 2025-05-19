export interface IMenu {
  list: IMenuItem[];
}
export interface IMenuItem {
  key: string;
  name: string;
  isSeparator: boolean;
  shortCut: string;
  iconFont: string;
  hasMenu: boolean;
  menu: Menu | undefined;
  disabled: boolean;
  valueKey: string;
  color: string | undefined;
}

export class Menu implements IMenu {
  list: MenuItem[] = [];
}

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
  isSeparator = false;
  shortCut = '';
  iconFont = '';
  hasMenu = false;
  menu: Menu | undefined = undefined;
  disabled = false;
  valueKey = '';
  color: string | undefined = undefined;
}

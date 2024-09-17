import { MenuItem } from '../shared/context-menu/context-menu-class';
import { MessageLibrary } from './string-constants';

export class MenuDataTemplate {
  public static copyCutPaste(): MenuItem[] {
    const value: MenuItem[] = [];
    value.push(
      ...[
        new MenuItem(
          'copy',
          MessageLibrary.COPY,
          false,
          'Ctr+C',
          'fa-regular fa-copy'
        ),
        new MenuItem(
          'cut',
          MessageLibrary.CUT,
          false,
          'Ctr+X',
          'fa-solid fa-scissors fa-rotate-270'
        ),
        new MenuItem(
          'paste',
          MessageLibrary.PASTE,
          false,
          'Ctr-V',
          'fa-solid fa-paste'
        ),
      ]
    );

    return value;
  }

  public static paste(): MenuItem[] {
    const value: MenuItem[] = [];
    value.push(
      ...[
        new MenuItem(
          'paste',
          MessageLibrary.PASTE,
          false,
          'Ctr-V',
          'fa-solid fa-paste'
        ),
      ]
    );

    return value;
  }
  public static divider(): MenuItem[] {
    const value: MenuItem[] = [];
    value.push(...[new MenuItem('', '', true)]);

    return value;
  }
  public static delete(): MenuItem[] {
    const value: MenuItem[] = [];
    value.push(
      ...[
        new MenuItem(
          'del',
          MessageLibrary.DELETE,
          false,
          'Delete',
          'fa-solid fa-trash'
        ),
      ]
    );

    return value;
  }
}

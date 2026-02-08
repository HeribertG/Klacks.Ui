import { MenuItem } from '../shared/context-menu/context-menu-class';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';

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

  public static edit(): MenuItem[] {
    const value: MenuItem[] = [];
    value.push(
      ...[
        new MenuItem(
          'edit',
          MessageLibrary.EDIT,
          false,
          '',
          'fa-solid fa-pen'
        ),
      ]
    );

    return value;
  }

  public static showInShift(): MenuItem[] {
    const value: MenuItem[] = [];
    value.push(
      ...[
        new MenuItem(
          'showInShift',
          MessageLibrary.SHOW_IN_SHIFT,
          false,
          '',
          'fa-solid fa-arrow-up'
        ),
      ]
    );

    return value;
  }

  public static showInSchedule(): MenuItem[] {
    const value: MenuItem[] = [];
    value.push(
      ...[
        new MenuItem(
          'showInSchedule',
          MessageLibrary.SHOW_IN_SCHEDULE,
          false,
          '',
          'fa-solid fa-arrow-down'
        ),
      ]
    );

    return value;
  }

  public static goToAddress(): MenuItem[] {
    const value: MenuItem[] = [];
    value.push(
      ...[
        new MenuItem(
          'goToAddress',
          MessageLibrary.GO_TO_ADDRESS,
          false,
          '',
          'fa-solid fa-user'
        ),
      ]
    );

    return value;
  }

  public static correction(): MenuItem[] {
    const value: MenuItem[] = [];
    value.push(
      ...[
        new MenuItem(
          'correction',
          MessageLibrary.CORRECTION,
          false,
          '',
          'fa-solid fa-clock'
        ),
      ]
    );

    return value;
  }

  public static replacement(): MenuItem[] {
    const value: MenuItem[] = [];
    value.push(
      ...[
        new MenuItem(
          'replacement',
          MessageLibrary.REPLACEMENT,
          false,
          '',
          'fa-solid fa-user-group'
        ),
      ]
    );

    return value;
  }

  public static editWork(): MenuItem[] {
    const value: MenuItem[] = [];
    value.push(
      ...[
        new MenuItem(
          'editWork',
          MessageLibrary.EDIT_WORK,
          false,
          '',
          'fa-solid fa-pen-to-square'
        ),
      ]
    );

    return value;
  }

  public static expenses(): MenuItem[] {
    const value: MenuItem[] = [];
    value.push(
      ...[
        new MenuItem(
          'expenses',
          MessageLibrary.EXPENSES,
          false,
          '',
          'fa-solid fa-money-bill'
        ),
      ]
    );

    return value;
  }

  public static confirm(): MenuItem[] {
    const value: MenuItem[] = [];
    value.push(
      ...[
        new MenuItem(
          'confirm',
          MessageLibrary.CONFIRM,
          false,
          '',
          'fa-solid fa-check'
        ),
      ]
    );

    return value;
  }

  public static unconfirm(): MenuItem[] {
    const value: MenuItem[] = [];
    value.push(
      ...[
        new MenuItem(
          'unconfirm',
          MessageLibrary.UNCONFIRM,
          false,
          '',
          'fa-solid fa-rotate-left'
        ),
      ]
    );

    return value;
  }
}

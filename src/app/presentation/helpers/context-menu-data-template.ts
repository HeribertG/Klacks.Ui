// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { MenuItem } from '../shared/context-menu/context-menu-class';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { PdfIconComponent } from '../icons/pdf-icon.component';
import { IconFlyComponent } from '../icons/icon-fly.component';

export class MenuDataTemplate {
  public static copyCutPaste(): MenuItem[] {
    const value: MenuItem[] = [];
    value.push(
      ...[
        new MenuItem(
          'copy',
          DomainMessages.COPY,
          false,
          'Ctr+C',
          'fa-regular fa-copy'
        ),
        new MenuItem(
          'cut',
          DomainMessages.CUT,
          false,
          'Ctr+X',
          'fa-solid fa-scissors fa-rotate-270'
        ),
        new MenuItem(
          'paste',
          DomainMessages.PASTE,
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
          DomainMessages.PASTE,
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
          DomainMessages.DELETE,
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
          DomainMessages.EDIT,
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
          DomainMessages.SHOW_IN_SHIFT,
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
          DomainMessages.SHOW_IN_SCHEDULE,
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
          DomainMessages.GO_TO_ADDRESS,
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
          DomainMessages.CORRECTION,
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
          DomainMessages.REPLACEMENT,
          false,
          '',
          'fa-solid fa-user-group'
        ),
      ]
    );

    return value;
  }

  public static openContainer(): MenuItem[] {
    const value: MenuItem[] = [];
    value.push(
      ...[
        new MenuItem(
          'openContainer',
          DomainMessages.OPEN_CONTAINER,
          false,
          '',
          'fa-solid fa-folder-open'
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
          DomainMessages.EDIT_WORK,
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
          DomainMessages.EXPENSES,
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
          DomainMessages.CONFIRM,
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
          DomainMessages.UNCONFIRM,
          false,
          '',
          'fa-solid fa-rotate-left'
        ),
      ]
    );

    return value;
  }

  public static staffSchedule(): MenuItem[] {
    const item = new MenuItem(
      'staffSchedule',
      DomainMessages.STAFF_SCHEDULE,
      false
    );
    item.svgIcon = PdfIconComponent.getSvg();
    return [item];
  }

  public static sendStaffSchedule(): MenuItem[] {
    const item = new MenuItem(
      'sendStaffSchedule',
      DomainMessages.SEND_STAFF_SCHEDULE,
      false
    );
    item.svgIcon = IconFlyComponent.getSvg('var(--standartTextColor)');
    return [item];
  }

  public static shiftPreferences(): MenuItem[] {
    return [
      new MenuItem(
        'shiftPreferences',
        DomainMessages.SHIFT_PREFERENCES,
        false,
        '',
        'fa-solid fa-sliders',
      ),
    ];
  }

  public static deleteBreakPlaceholder(): MenuItem[] {
    return [
      new MenuItem(
        'deleteBreakPlaceholder',
        DomainMessages.DELETE_BREAK_PLACEHOLDER,
        false,
        '',
        'fa-solid fa-trash'
      ),
    ];
  }

  public static editContainerShift(): MenuItem[] {
    return [
      new MenuItem(
        'editContainerShift',
        DomainMessages.EDIT_CONTAINER_SHIFT,
        false,
        '',
        'fa-solid fa-pen'
      ),
    ];
  }

  public static resetContainerShift(): MenuItem[] {
    return [
      new MenuItem(
        'resetContainerShift',
        DomainMessages.RESET_CONTAINER_SHIFT,
        false,
        '',
        'fa-solid fa-rotate-left'
      ),
    ];
  }

}

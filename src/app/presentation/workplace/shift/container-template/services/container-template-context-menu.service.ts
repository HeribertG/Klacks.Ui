// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Context menu of the container template items and the dialogs it opens: the properties dialog for a shift,
 * the time dialog for an absence block.
 * @param contextMenu - Menu instance of the host component the entries are shown in
 * @param propertiesModal - Template of the shift properties dialog
 * @param absenceTimeModal - Template of the absence time dialog
 */
import { Injectable, TemplateRef, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-item.interface';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { ContextMenuComponent } from 'src/app/presentation/shared/context-menu/context-menu.component';
import { Menu } from 'src/app/presentation/shared/context-menu/context-menu-class';
import { MenuItem } from 'src/app/presentation/shared/context-menu/menu-item-class';
import { IShiftContextMenuEvent } from 'src/app/presentation/shared/time-ruler/shift-context-menu-event.interface';
import {
  CONTAINER_TEMPLATE_PROPERTIES_MENU_KEY,
  CONTAINER_TEMPLATE_PROPERTIES_MENU_LABEL_KEY,
} from '../container-template.constants';
import { ContainerTemplateEditorStateService } from './container-template-editor-state.service';
import { ContainerTemplatePropertiesService } from './container-template-properties.service';
import { ContainerTemplateAbsenceService } from './container-template-absence.service';

@Injectable()
export class ContainerTemplateContextMenuService {
  private state = inject(ContainerTemplateEditorStateService);
  private propertiesService = inject(ContainerTemplatePropertiesService);
  private absenceService = inject(ContainerTemplateAbsenceService);
  private shiftService = inject(ContainerTemplateShiftService);
  private translateService = inject(TranslateService);

  openForTimelineShift(event: IShiftContextMenuEvent, contextMenu: ContextMenuComponent): void {
    this.selectTarget(event.item);
    this.open(event.mouseEvent, contextMenu);
  }

  openForTableRow(event: MouseEvent, item: IContainerTemplateItem, contextMenu: ContextMenuComponent): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectTarget(item);
    this.open(event, contextMenu);
  }

  onMenuClick(
    keys: string[],
    contextMenu: ContextMenuComponent,
    propertiesModal: TemplateRef<unknown>,
    absenceTimeModal: TemplateRef<unknown>,
  ): void {
    if (keys.includes(CONTAINER_TEMPLATE_PROPERTIES_MENU_KEY)) {
      this.openPropertiesDialog(propertiesModal, absenceTimeModal);
    }
    contextMenu.closeMenu(true);
  }

  openAbsenceTimeDialog(item: IContainerTemplateItem, absenceTimeModal: TemplateRef<unknown>): void {
    this.absenceService.openAbsenceTimeModal(
      item,
      absenceTimeModal,
      this.state.timeFrom,
      this.state.timeTo,
      this.state.selectedWeekday,
      this.state.isHoliday,
    );
  }

  private selectTarget(item: IContainerTemplateItem): void {
    this.propertiesService.contextMenuTargetItem = item;
    this.shiftService.setSelectedShift(item);
  }

  private open(event: MouseEvent, contextMenu: ContextMenuComponent): void {
    const menuData = new Menu();
    menuData.list.push(
      new MenuItem(
        CONTAINER_TEMPLATE_PROPERTIES_MENU_KEY,
        this.translateService.instant(CONTAINER_TEMPLATE_PROPERTIES_MENU_LABEL_KEY),
        false,
      ),
    );

    contextMenu.menuData = menuData;
    contextMenu.openMenu(event);
  }

  private openPropertiesDialog(propertiesModal: TemplateRef<unknown>, absenceTimeModal: TemplateRef<unknown>): void {
    const target = this.propertiesService.contextMenuTargetItem;
    if (target?.absenceId) {
      this.openAbsenceTimeDialog(target, absenceTimeModal);
      return;
    }
    this.propertiesService.openPropertiesDialog(propertiesModal, this.state.selectedWeekday, this.state.isHoliday);
  }
}

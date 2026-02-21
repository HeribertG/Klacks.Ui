import { Injectable, inject } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { TranslateService } from '@ngx-translate/core';
import { BreakPlaceholder, IBreakPlaceholder } from 'src/app/domain/models/break/break-class';
import { EntrySource } from 'src/app/domain/enums/entry-source.enum';
import { cloneObject } from 'src/app/shared/helpers/object.helper';
import { ContextMenuComponent } from 'src/app/presentation/shared/context-menu/context-menu.component';
import { MenuDataTemplate } from 'src/app/presentation/helpers/context-menu-data-template';
import {
  Menu,
  MenuItem,
} from 'src/app/presentation/shared/context-menu/context-menu-class';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { FallbackPipe } from 'src/app/application/pipes/fallback/fallback.pipe';
import { DrawCalendarGanttService } from 'src/app/presentation/workplace/absence-gantt/services/draw-calendar-gantt.service';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/break/data-management-break-placeholder.service';
import { DataManagementAbsenceGanttService } from 'src/app/domain/services/absence/data-management-absence-gantt.service';

@Injectable()
export class AbsenceGanttContextMenuService {
  private drawCalendarGantt = inject(DrawCalendarGanttService);
  private dataManagementBreak = inject(DataManagementBreakPlaceholderService);
  private dataManagementAbsence = inject(DataManagementAbsenceGanttService);
  private translateService = inject(TranslateService);
  private clipboard = inject(Clipboard);

  private copiedBreaks: IBreakPlaceholder[] = [];
  private contextMenu: ContextMenuComponent | undefined;

  setContextMenu(contextMenu: ContextMenuComponent): void {
    this.contextMenu = contextMenu;
  }

  createContextMenu(event: MouseEvent, isOverSelection: boolean): void {
    const menuData = new Menu();
    const isScheduleBreak = this.drawCalendarGantt.selectedBreak?.entrySource === EntrySource.Schedule;

    if (isOverSelection && !isScheduleBreak) {
      menuData.list.push(...MenuDataTemplate.divider());
      menuData.list.push(...MenuDataTemplate.copyCutPaste());
      menuData.list.push(...MenuDataTemplate.delete());
      menuData.list.push(...MenuDataTemplate.divider());

      const convertMenu = new MenuItem(
        'convert',
        DomainMessages.CONVERT,
        false
      );
      convertMenu.hasMenu = true;
      menuData.list.push(convertMenu);

      const subMenu = this.createSubConvertMenu();
      if (subMenu) {
        menuData.list[6].menu = subMenu;
      }
    } else {
      menuData.list.push(...MenuDataTemplate.paste());
    }

    const pastMenu = menuData.list.find((x) => x.key === 'paste');
    if (pastMenu) {
      pastMenu.disabled = !this.hasCopiedBreaks();
    }

    this.contextMenu!.menuData = menuData;
  }

  private createSubConvertMenu(): Menu | undefined {
    if (this.drawCalendarGantt.selectedBreak) {
      const menuData = new Menu();
      const list = this.dataManagementAbsence.absenceList();
      const id = this.drawCalendarGantt.selectedBreak.id;
      const c = new FallbackPipe();
      list.forEach((x) => {
        if (x.id !== id) {
          const menuItem = new MenuItem(
            'convertItem',
            c.transform(x.name!, this.translateService.currentLang)!,
            false
          );
          menuItem.valueKey = x.id!;
          menuItem.color = x.color;
          menuData.list.push(menuItem);
        }
      });
      return menuData;
    }
    return undefined;
  }

  menuClicked(keys: string[]): void {
    switch (keys[0]) {
      case 'del':
        this.contextMenu!.closeMenu(true);
        this.deleteBreak();
        break;

      case 'copy':
        this.contextMenu!.closeMenu(true);
        this.copy();
        break;
      case 'cut':
        this.contextMenu!.closeMenu(true);
        this.cut();
        break;
      case 'paste':
        this.contextMenu!.closeMenu(true);
        this.paste();
        break;
      case 'convertItem':
        this.contextMenu!.closeMenu(true);
        if (this.drawCalendarGantt.selectedBreak && keys[1]) {
          this.drawCalendarGantt.selectedBreak.absenceId = keys[1];
          this.updateBreak();
        }
        break;
    }
  }

  menuClose(): void {
    this.contextMenu!.closeMenu();
  }

  copy(): void {
    this.copiedBreaks = [];
    if (
      this.drawCalendarGantt.selectedRow > -1 &&
      this.drawCalendarGantt.selectedBreak
    ) {
      const tmp = cloneObject<IBreakPlaceholder>(
        this.drawCalendarGantt.selectedBreak
      ) as BreakPlaceholder;

      delete tmp.client;
      delete tmp.absence;
      delete tmp.id;

      const txt = JSON.stringify(tmp);
      this.clipboard.copy(txt);

      this.copiedBreaks.push(tmp);
    }
  }

  async paste(): Promise<void> {
    if (this.drawCalendarGantt.selectedRow) {
      this.copiedBreaks.forEach((x) => {
        this.dataManagementBreak.addBreak(
          this.drawCalendarGantt.selectedRow,
          x
        );
      });
    }
  }

  cut(): void {
    this.copy();
    this.deleteBreak();
  }

  hasCopiedBreaks(): boolean {
    return this.copiedBreaks.length > 0;
  }

  deleteBreak(): void {
    if (
      this.drawCalendarGantt.selectedRow > -1 &&
      this.drawCalendarGantt.selectedBreak
    ) {
      this.dataManagementBreak.deleteBreak(
        this.drawCalendarGantt.selectedRow,
        this.drawCalendarGantt.selectedBreak
      );
    }
  }

  updateBreak(): void {
    if (
      this.drawCalendarGantt.selectedRow > -1 &&
      this.drawCalendarGantt.selectedBreak
    ) {
      this.dataManagementBreak.updateBreak(
        this.drawCalendarGantt.selectedRow,
        this.drawCalendarGantt.selectedBreak
      );
    }
  }
}

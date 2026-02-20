/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Component rendering the row headers for the schedule grid.
 * Displays client information (name, ID, period hours) in a fixed left column.
 * Handles scrolling synchronization with the main grid.
 * Supports context menu for navigation to client details.
 *
 * @relations
 * - Parent: ScheduleSectionComponent
 * - Uses: BaseDrawRowHeaderService for rendering
 * - Uses: BaseCreateRowHeaderService for content creation
 */
import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  ElementRef,
  inject,
  Input,
  OnChanges,
  SimpleChanges,
  effect,
  EffectRef,
  Injector,
  runInInjectionContext,
  computed,
} from '@angular/core';
import { NgStyle } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { ScrollEventService } from 'src/app/presentation/shared/scrollbar/scroll-event.service';

import { ResizeDirective } from 'src/app/presentation/directives/resize.directive';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';

import { BaseCreateRowHeaderService } from 'src/app/presentation/workplace/schedule/schedule-section/services/create-row-header.service';
import { BaseDrawRowHeaderService } from 'src/app/presentation/workplace/schedule/schedule-section/services/draw-row-header.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ClientFilterComponent } from 'src/app/presentation/shared/client-filter/client-filter.component';
import { Size } from 'src/app/shared/helpers/geometry.helper';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { CursorEnum } from 'src/app/presentation/shared/grid/enums/cursor_enums';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { WorkScheduleLoaderService } from 'src/app/domain/services/schedule/work-schedule-loader.service';
import { ProgressBarAnimationService } from 'src/app/presentation/shared/grid/services/progress-bar-animation.service';
import { TranslateService } from '@ngx-translate/core';
import { TooltipService } from 'src/app/presentation/shared/tooltip/tooltip.service';
import { ContextMenuComponent } from 'src/app/presentation/shared/context-menu/context-menu.component';
import { ContextMenuService } from 'src/app/presentation/shared/context-menu/context-menu.service';
import { Menu } from 'src/app/presentation/shared/context-menu/context-menu-class';
import { MenuDataTemplate } from 'src/app/presentation/helpers/context-menu-data-template';
import { ScheduleReportContextService } from 'src/app/domain/services/report/schedule-report-context.service';
import { ReportDefaultsService } from 'src/app/domain/services/report/report-defaults.service';
import { formatDateOnly } from 'src/app/shared/helpers/date.helper';
import { ScheduleChangeService } from 'src/app/domain/services/schedule/schedule-change.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';

@Component({
  selector: 'app-schedule-schedule-row-header',
  templateUrl: './schedule-schedule-row-header.component.html',
  styleUrls: ['./schedule-schedule-row-header.component.scss'],
  standalone: true,
  imports: [NgStyle, ResizeDirective, ClientFilterComponent, ContextMenuComponent],
  providers: [
    BaseCreateRowHeaderService,
    BaseDrawRowHeaderService,
    ProgressBarAnimationService,
    ContextMenuService,
  ],
})
export class ScheduleScheduleRowHeaderComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('box') boxElement!: ElementRef<HTMLDivElement>;
  @ViewChild('contextMenu', { static: false })
  contextMenu!: ContextMenuComponent;

  @Input() valueChangeVScrollbar!: number;

  public dataService = inject(BaseDataService);
  public scroll = inject(ScrollService);
  public drawRowHeader = inject(BaseDrawRowHeaderService);
  public dataManagementSchedule = inject(DataManagementScheduleService);
  private workScheduleLoader = inject(WorkScheduleLoaderService);
  private injector = inject(Injector);
  private settings = inject(BaseSettingsService);
  private scrollEventService = inject(ScrollEventService);
  private translateService = inject(TranslateService);
  private tooltipService = inject(TooltipService);
  private router = inject(Router);
  private contextMenuService = inject(ContextMenuService);
  private scheduleReportCtx = inject(ScheduleReportContextService);
  private reportDefaults = inject(ReportDefaultsService);
  private scheduleChangeService = inject(ScheduleChangeService);
  private appSettings = inject(AppSettingsManagementService);

  private isEmailConfigured = computed(() => {
    const e = this.appSettings.emailSettings();
    return !!e.outgoingServer && !!e.outgoingServerPort && !!e.username && !!e.password;
  });

  private ngUnsubscribe = new Subject<void>();
  private effects: EffectRef[] = [];

  filterStyle: Record<string, string> = { visibility: 'hidden' };
  private iconSize = 16;
  private contextMenuRow = -1;

  private set currentCursor(cursor: CursorEnum) {
    document.body.style.cursor = cursor;
  }

  ngOnInit(): void {
    this.destroyFilter();
    this.drawRowHeader.filterImage = DrawHelper.createImage(
      new Size(this.iconSize, this.iconSize),
      'assets/svg/sorting.svg'
    );
    this.reportDefaults.load();
  }

  ngAfterViewInit(): void {
    this.initializeDrawRowHeader();
    this.readSignals();

    this.contextMenu?.hasClicked
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((keys) => {
        this.menuClicked(keys);
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this.drawRowHeader.deleteCanvas();

    this.effects.forEach((effectRef) => {
      if (effectRef) {
        effectRef.destroy();
      }
    });
    this.effects = [];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['valueChangeHScrollbar']) {
      const prevH = changes['valueChangeHScrollbar'].previousValue;
      const currH = changes['valueChangeHScrollbar'].currentValue;

      if (currH !== prevH) {
        this.scroll.horizontalScrollPosition = currH;
      }
    }

    if (changes['valueChangeVScrollbar']) {
      const prevV = changes['valueChangeVScrollbar'].previousValue;
      const currV = changes['valueChangeVScrollbar'].currentValue;
      if (currV !== prevV) {
        this.scroll.verticalScrollPosition = currV;
      }
    }
  }

  onResize(entries: ResizeObserverEntry[]): void {
    if (entries && entries.length > 0) {
      const entry = entries[0];
      this.updateDrawRowHeaderDimensions(entry.target as HTMLElement);
      this.drawRowHeader.refresh();
    }
  }

  private initializeDrawRowHeader(): void {
    this.updateDrawRowHeaderDimensions();
    this.drawRowHeader.createCanvas();
  }

  private updateDrawRowHeaderDimensions(element?: Element): void {
    const box = element || this.boxElement.nativeElement;
    this.drawRowHeader.width = box.clientWidth;
    this.drawRowHeader.height = box.clientHeight;
  }

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      const zoomEffect = effect(() => {
        this.settings.zoomSignal();
        setTimeout(() => {
          if (this.drawRowHeader.isCanvasAvailable()) {
            this.drawRowHeader.createCanvas();
            this.drawRowHeader.rebuild();
            this.drawRowHeader.redraw();
          }
        }, 0);
      });
      this.effects.push(zoomEffect);

      const refreshEffect = effect(() => {
        this.dataService.refreshSignal();
        this.drawRowHeader.redraw();
      });
      this.effects.push(refreshEffect);

      const dataReadEffect = effect(() => {
        const readState = this.dataManagementSchedule.isRead();
        if (readState.value) {
          this.drawRowHeader.redraw();
        }
      });
      this.effects.push(dataReadEffect);

      const positionEffect = effect(() => {
        this.drawRowHeader.cellManipulation.positionSignal();
        if (this.drawRowHeader.isCanvasAvailable()) {
          this.drawRowHeader.drawRowHeaderSelection();
        }
      });
      this.effects.push(positionEffect);

      const scrollEffect = effect(() => {
        this.scrollEventService.scrollPosition();
        if (this.drawRowHeader.isCanvasAvailable()) {
          this.drawRowHeader.moveGrid();
        }
      });
      this.effects.push(scrollEffect);

      const periodHoursEffect = effect(() => {
        const _timestamp = this.workScheduleLoader.periodHoursUpdated();

        if (this.drawRowHeader.isCanvasAvailable()) {

          this.drawRowHeader.redraw();
        }
      });
      this.effects.push(periodHoursEffect);

      const dirtyStateEffect = effect(() => {
        const _timestamp = this.scheduleChangeService.dirtyStateUpdated();
        if (this.drawRowHeader.isCanvasAvailable()) {
          this.drawRowHeader.redraw();
        }
      });
      this.effects.push(dirtyStateEffect);
    });
  }

  private getMousePos(event: MouseEvent): { x: number; y: number } | undefined {
    if (!this.drawRowHeader.canvas) return undefined;

    const rect = this.drawRowHeader.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  onMouseMove(event: MouseEvent): void {
    const pos = this.getMousePos(event);
    if (!pos) return;

    if (this.drawRowHeader.recFilterIcon) {
      if (this.drawRowHeader.recFilterIcon.pointInRect(pos.x, pos.y)) {
        this.currentCursor = CursorEnum.pointer;
        this.tooltipService.hide();
        return;
      } else {
        this.currentCursor = CursorEnum.default;
      }
    }

    if (this.checkContractSymbolTooltip(event, pos)) {
      return;
    }

    if (this.checkDirtyDotTooltip(event, pos)) {
      return;
    }

    this.checkInfoSpotTooltip(event, pos);
  }

  private checkContractSymbolTooltip(event: MouseEvent, pos: { x: number; y: number }): boolean {
    const canvas = this.drawRowHeader.canvas;
    if (!canvas) return false;

    const row = Math.floor((pos.y - this.settings.cellHeaderHeight) / this.settings.cellHeight) + this.scroll.verticalScrollPosition;
    if (row < 0 || row >= this.dataService.rows) return false;

    const clientIndex = this.dataService.rowGroupIndex[row];
    if (clientIndex === undefined) return false;

    const client = this.dataService.getGroupIndex(clientIndex);
    if (!client || client.hasContract) return false;

    const firstRow = this.dataService.indexGroupRow[clientIndex];
    const cellHeight = this.settings.cellHeight;
    const localY = pos.y - this.settings.cellHeaderHeight - ((firstRow - this.scroll.verticalScrollPosition) * cellHeight);
    const sectionHeight = cellHeight / 3;

    if (localY >= 0 && localY <= sectionHeight && pos.x >= 0 && pos.x <= 24) {
      const tooltipText = this.translateService.instant('schedule.row-header.no-contract.tooltip');
      this.tooltipService.show({
        text: tooltipText,
        x: event.clientX,
        y: event.clientY,
      });
      return true;
    }

    return false;
  }

  private checkDirtyDotTooltip(event: MouseEvent, pos: { x: number; y: number }): boolean {
    const canvas = this.drawRowHeader.canvas;
    if (!canvas) return false;

    const row = Math.floor((pos.y - this.settings.cellHeaderHeight) / this.settings.cellHeight) + this.scroll.verticalScrollPosition;
    if (row < 0 || row >= this.dataService.rows) return false;

    const clientIndex = this.dataService.rowGroupIndex[row];
    if (clientIndex === undefined) return false;

    const client = this.dataService.getGroupIndex(clientIndex);
    if (!client || !this.scheduleChangeService.isDirty(client.id)) return false;

    const firstRow = this.dataService.indexGroupRow[clientIndex];
    const localY = pos.y - this.settings.cellHeaderHeight - ((firstRow - this.scroll.verticalScrollPosition) * this.settings.cellHeight);
    const sectionHeight = this.settings.cellHeight / 3;

    const textAreaWidth = canvas.getBoundingClientRect().width - this.settings.InfoSpotWidth;
    const dotRadius = 4.5 * this.settings.zoom;
    const dotX = textAreaWidth - dotRadius - 4;
    const dotY = dotRadius + 2;
    const hitRadius = dotRadius + 4;

    if (localY >= 0 && localY <= sectionHeight &&
        Math.abs(pos.x - dotX) <= hitRadius && Math.abs(localY - dotY) <= hitRadius) {
      const tooltipText = this.translateService.instant('schedule.row-header.dirty.tooltip');
      this.tooltipService.show({
        text: tooltipText,
        x: event.clientX,
        y: event.clientY,
      });
      return true;
    }

    return false;
  }

  private checkInfoSpotTooltip(event: MouseEvent, pos: { x: number; y: number }): void {
    const canvas = this.drawRowHeader.canvas;
    if (!canvas) {
      this.tooltipService.hide();
      return;
    }

    const row = Math.floor((pos.y - this.settings.cellHeaderHeight) / this.settings.cellHeight) + this.scroll.verticalScrollPosition;

    if (row < 0 || row >= this.dataService.rows) {
      this.tooltipService.hide();
      return;
    }

    const clientIndex = this.dataService.rowGroupIndex[row];
    if (clientIndex === undefined) {
      this.tooltipService.hide();
      return;
    }

    const firstRow = this.dataService.indexGroupRow[clientIndex];
    const client = this.dataService.getGroupIndex(clientIndex);
    const lastRow = firstRow + (client?.displayRows ?? 1) - 1;

    if (row < firstRow || row > lastRow) {
      this.tooltipService.hide();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const visualWidth = rect.width;
    const canvasWidth = canvas.width;
    const scale = canvasWidth / visualWidth;

    const widthWithoutInfoSpot = visualWidth - (this.settings.InfoSpotWidth / scale);

    if (pos.x < widthWithoutInfoSpot) {
      this.tooltipService.hide();
      return;
    }

    const localY = pos.y - this.settings.cellHeaderHeight - ((firstRow - this.scroll.verticalScrollPosition) * this.settings.cellHeight);

    const slot1Top = this.settings.increaseBorder;
    const slot1Bottom = this.settings.cellHeaderHeight;
    const slot2Top = this.settings.cellHeaderHeight + this.settings.borderWidth;
    const slot2Bottom = this.settings.cellHeaderHeight * 2 + this.settings.borderWidth;
    const slot3Top = this.settings.cellHeaderHeight * 2 + this.settings.borderWidth * 2;
    const slot3Bottom = this.settings.cellHeaderHeight * 3 + this.settings.borderWidth;

    let tooltipKey = '';

    if (localY >= slot1Top && localY <= slot1Bottom) {
      tooltipKey = 'schedule.row-header.slot1.tooltip';
    } else if (localY >= slot2Top && localY <= slot2Bottom) {
      tooltipKey = 'schedule.row-header.slot2.tooltip';
    } else if (localY >= slot3Top && localY <= slot3Bottom) {
      tooltipKey = 'schedule.row-header.slot3.tooltip';
    }

    if (tooltipKey) {
      const tooltipText = this.translateService.instant(tooltipKey);
      this.tooltipService.show({
        text: tooltipText,
        x: event.clientX,
        y: event.clientY,
      });
    } else {
      this.tooltipService.hide();
    }
  }

  onCanvasClick(event: MouseEvent): void {
    const pos = this.getMousePos(event);
    if (!pos) return;

    if (this.drawRowHeader.recFilterIcon) {
      if (this.drawRowHeader.recFilterIcon.pointInRect(pos.x, pos.y)) {
        this.showFilter();
      }
    }
  }

  onRightClick(event: MouseEvent): void {
    event.preventDefault();
    if (!this.contextMenu) return;

    const pos = this.getMousePos(event);
    if (!pos) return;

    const row = Math.floor((pos.y - this.settings.cellHeaderHeight) / this.settings.cellHeight) + this.scroll.verticalScrollPosition;
    
    if (row < 0 || row >= this.dataService.rows) {
      return;
    }

    const groupIndex = this.dataService.rowGroupIndex[row];
    if (groupIndex === undefined) {
      return;
    }

    const client = this.dataService.getGroupIndex(groupIndex);
    if (!client?.id) {
      return;
    }

    this.contextMenuRow = row;
    this.createContextMenu();
    
    this.contextMenu.openMenu({
      clientX: event.clientX,
      clientY: event.clientY,
    } as MouseEvent);
  }

  private createContextMenu(): void {
    const menuData = new Menu();
    menuData.list.push(...MenuDataTemplate.goToAddress());
    if (this.reportDefaults.hasDefault('schedule')) {
      menuData.list.push(...MenuDataTemplate.staffSchedule());
      if (this.isEmailConfigured()) {
        menuData.list.push(...MenuDataTemplate.sendStaffSchedule());
      }
    }
    this.contextMenu.menuData = menuData;
  }

  private menuClicked(keys: string[]): void {
    if (!keys || keys.length === 0) return;

    switch (keys[0]) {
      case 'goToAddress':
        this.contextMenu.closeMenu(true);
        this.navigateToAddress();
        break;
      case 'staffSchedule':
        this.contextMenu.closeMenu(true);
        this.generateStaffSchedule();
        break;
      case 'sendStaffSchedule':
        this.contextMenu.closeMenu(true);
        this.sendStaffSchedule();
        break;
    }
  }

  private navigateToAddress(): void {
    const row = this.contextMenuRow;
    if (row < 0 || row >= this.dataService.rows) {
      return;
    }

    const groupIndex = this.dataService.rowGroupIndex[row];
    if (groupIndex === undefined) {
      return;
    }

    const client = this.dataService.getGroupIndex(groupIndex);
    if (client?.id) {
      this.router.navigate(['/workplace/edit-address', client.id], {
        queryParams: { readonly: 'true', returnUrl: '/workplace/schedule' }
      });
    }
  }

  private generateStaffSchedule(): void {
    const row = this.contextMenuRow;
    const groupIndex = this.dataService.rowGroupIndex[row];
    const client = this.dataService.getGroupIndex(groupIndex);

    if (!client?.id) return;

    const startDate = this.dataManagementSchedule.visibleStartDate;
    const endDate = this.dataManagementSchedule.visibleEndDate;

    if (!startDate || !endDate) return;

    this.scheduleReportCtx.generateForClient(
      client.id,
      `${client.firstName} ${client.name}`,
      formatDateOnly(startDate),
      formatDateOnly(endDate)
    );
  }

  private sendStaffSchedule(): void {
    const row = this.contextMenuRow;
    const groupIndex = this.dataService.rowGroupIndex[row];
    const client = this.dataService.getGroupIndex(groupIndex);

    if (!client?.id) return;

    const startDate = this.dataManagementSchedule.visibleStartDate;
    const endDate = this.dataManagementSchedule.visibleEndDate;

    if (!startDate || !endDate) return;

    this.scheduleReportCtx.sendForClient(
      client.id,
      `${client.firstName} ${client.name}`,
      formatDateOnly(startDate),
      formatDateOnly(endDate)
    );
  }

  onFilterMouseLeave(): void {
    this.destroyFilter();
  }

  onCanvasMouseLeave(): void {
    this.tooltipService.hide();
  }

  onFilterChange(): void {
    this.dataManagementSchedule.readWorkSchedule(false);
  }

  private showFilter(): void {
    const canvas = this.drawRowHeader.canvas;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    const leftPos = rect.left;

    this.filterStyle = {
      visibility: 'visible',
      left: leftPos + 'px',
      top:
        this.drawRowHeader.recFilterIcon.top +
        this.drawRowHeader.recFilterIcon.height +
        rect.top +
        'px',
    };
  }

  private destroyFilter(): void {
    this.filterStyle = {
      visibility: 'hidden',
    };
  }

}

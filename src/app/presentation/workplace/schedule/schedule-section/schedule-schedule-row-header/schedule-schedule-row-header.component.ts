// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Component rendering the row headers for the schedule grid.
 * Displays client information (name, ID, period hours) in a fixed left column.
 * Handles scrolling synchronization with the main grid.
 * Delegates tooltip, report, and context-menu logic to extracted services.
 *
 * @relations
 * - Parent: ScheduleSectionComponent
 * - Uses: BaseDrawRowHeaderService for rendering
 * - Uses: BaseCreateRowHeaderService for content creation
 * - Uses: RowHeaderTooltipService for tooltip management
 * - Uses: RowHeaderReportService for report generation and context-menu actions
 */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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
  viewChild,
} from '@angular/core';
import { NgStyle } from '@angular/common';
import { CdkDrag, CdkDragDrop, CdkDropList, CdkDragPlaceholder, CdkDragHandle, moveItemInArray } from '@angular/cdk/drag-drop';
import { ClientSortPreferenceService } from 'src/app/domain/services/schedule/client-sort-preference.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { IClientWork } from 'src/app/domain/models/schedule/schedule-class';
import { Subject, takeUntil } from 'rxjs';
import { ScrollEventService } from 'src/app/presentation/shared/scrollbar/scroll-event.service';

import { ResizeDirective } from 'src/app/presentation/directives/resize.directive';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';

import { BaseCreateRowHeaderService } from 'src/app/presentation/workplace/schedule/schedule-section/services/create-row-header.service';
import { BaseDrawRowHeaderService } from 'src/app/presentation/workplace/schedule/schedule-section/services/draw-row-header.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ClientFilterComponent } from 'src/app/presentation/shared/client-filter/client-filter.component';
import { CursorEnum } from 'src/app/presentation/shared/grid/enums/cursor_enums';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { WorkScheduleLoaderService } from 'src/app/domain/services/schedule/work-schedule-loader.service';
import { ProgressBarAnimationService } from 'src/app/presentation/shared/grid/services/progress-bar-animation.service';
import { ContextMenuComponent } from 'src/app/presentation/shared/context-menu/context-menu.component';
import { ContextMenuService } from 'src/app/presentation/shared/context-menu/context-menu.service';
import { ScheduleChangeService } from 'src/app/domain/services/schedule/schedule-change.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { RowHeaderIconsService } from 'src/app/presentation/shared/grid/services/row-header-icons.service';
import { RowHeaderTooltipService } from './row-header-tooltip.service';
import { RowHeaderReportService } from './row-header-report.service';
import { ShiftPreferencesDialogComponent } from '../../dialogs/shift-preferences-dialog/shift-preferences-dialog.component';

@Component({
  selector: 'app-schedule-schedule-row-header',
  templateUrl: './schedule-schedule-row-header.component.html',
  styleUrls: ['./schedule-schedule-row-header.component.scss'],
  standalone: true,
  imports: [
    NgStyle,
    ResizeDirective,
    ClientFilterComponent,
    ContextMenuComponent,
    ShiftPreferencesDialogComponent,
    CdkDrag,
    CdkDropList,
    CdkDragPlaceholder,
    CdkDragHandle,
  ],
  providers: [
    BaseCreateRowHeaderService,
    BaseDrawRowHeaderService,
    ProgressBarAnimationService,
    ContextMenuService,
    RowHeaderTooltipService,
    RowHeaderReportService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleScheduleRowHeaderComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('box') boxElement!: ElementRef<HTMLDivElement>;
  @ViewChild('contextMenu', { static: false })
  contextMenu!: ContextMenuComponent;
  @ViewChild(ShiftPreferencesDialogComponent)
  shiftPreferencesDialog!: ShiftPreferencesDialogComponent;

  @Input() valueChangeVScrollbar!: number;

  public dataService = inject(BaseDataService);
  public scroll = inject(ScrollService);
  public drawRowHeader = inject(BaseDrawRowHeaderService);
  public dataManagementSchedule = inject(DataManagementScheduleService);
  private workScheduleLoader = inject(WorkScheduleLoaderService);
  private injector = inject(Injector);
  protected settings = inject(BaseSettingsService);
  private scrollEventService = inject(ScrollEventService);
  private scheduleChangeService = inject(ScheduleChangeService);
  private gridColorService = inject(GridColorService);
  private rowHeaderIcons = inject(RowHeaderIconsService);
  private tooltipHelper = inject(RowHeaderTooltipService);
  private reportHelper = inject(RowHeaderReportService);
  private cdr = inject(ChangeDetectorRef);
  private readonly clientSortPreference = inject(ClientSortPreferenceService);
  private readonly toastShow = inject(ToastShowService);

  private ngUnsubscribe = new Subject<void>();
  private effects: EffectRef[] = [];
  private isDestroyed = false;

  filterStyle: Record<string, string> = { visibility: 'hidden' };
  protected sortedClients: IClientWork[] = [];
  protected scrollOffsetPx = 0;
  private filterEl = viewChild<ElementRef>('filterEl');
  private iconSize = 16;
  private contextMenuRow = -1;

  private set currentCursor(cursor: CursorEnum) {
    document.body.style.cursor = cursor;
  }

  private syncSortedClients(): void {
    this.sortedClients = [...this.dataManagementSchedule.clients];
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this.destroyFilter();
    this.drawRowHeader.filterImage = this.rowHeaderIcons.sortingPicto;
    this.reportHelper.loadDefaults();
  }

  ngAfterViewInit(): void {
    this.initializeDrawRowHeader();
    this.readSignals();
    this.syncSortedClients();

    this.contextMenu?.hasClicked
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((keys) => {
        this.menuClicked(keys);
      });
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
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
        this.scrollOffsetPx = currV * this.settings.cellHeight;
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
          if (this.isDestroyed) return;
          if (this.drawRowHeader.isCanvasAvailable()) {
            this.drawRowHeader.createCanvas();
            this.drawRowHeader.rebuild();
            this.drawRowHeader.redraw();
          }
          this.scrollOffsetPx = this.scroll.verticalScrollPosition * this.settings.cellHeight;
          this.cdr.markForCheck();
        }, 0);
      });
      this.effects.push(zoomEffect);

      const refreshEffect = effect(() => {
        this.dataService.refreshSignal();
        this.drawRowHeader.redraw();
        this.syncSortedClients();
      });
      this.effects.push(refreshEffect);

      const dataReadEffect = effect(() => {
        const readState = this.dataManagementSchedule.isRead();
        if (readState.count > 0) {
          this.drawRowHeader.redraw();
          this.syncSortedClients();
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
          this.syncSortedClients();
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

      const colorResetEffect = effect(() => {
        if (this.gridColorService.isReset()) {
          const icon = this.rowHeaderIcons.sortingPicto;
          if (icon) {
            this.drawRowHeader.filterImage = icon;
          }
          this.drawRowHeader.redraw();
        }
      });
      this.effects.push(colorResetEffect);
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
        this.tooltipHelper.hide();
        return;
      } else {
        this.currentCursor = CursorEnum.default;
      }
    }

    const canvas = this.drawRowHeader.canvas;

    if (this.tooltipHelper.checkContractSymbolTooltip(event, pos, canvas)) {
      return;
    }

    if (this.tooltipHelper.checkDirtyDotTooltip(event, pos, canvas)) {
      return;
    }

    this.tooltipHelper.checkInfoSpotTooltip(event, pos, canvas);
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

    const row =
      Math.floor(
        (pos.y - this.settings.cellHeaderHeight) / this.settings.cellHeight,
      ) + this.scroll.verticalScrollPosition;

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
    this.contextMenu.menuData = this.reportHelper.createContextMenu();

    this.contextMenu.openMenu({
      clientX: event.clientX,
      clientY: event.clientY,
    } as MouseEvent);
  }

  private menuClicked(keys: string[]): void {
    if (!keys || keys.length === 0) return;

    switch (keys[0]) {
      case 'goToAddress':
        this.contextMenu.closeMenu(true);
        this.reportHelper.navigateToAddress(this.contextMenuRow);
        break;
      case 'staffSchedule':
        this.contextMenu.closeMenu(true);
        this.reportHelper.generateStaffSchedule(this.contextMenuRow);
        break;
      case 'sendStaffSchedule':
        this.contextMenu.closeMenu(true);
        this.reportHelper.sendStaffSchedule(this.contextMenuRow);
        break;
      case 'shiftPreferences':
        this.contextMenu.closeMenu(true);
        this.openShiftPreferencesDialog(this.contextMenuRow);
        break;
    }
  }

  private openShiftPreferencesDialog(row: number): void {
    if (row < 0 || row >= this.dataService.rows) return;

    const groupIndex = this.dataService.rowGroupIndex[row];
    if (groupIndex === undefined) return;

    const client = this.dataService.getGroupIndex(groupIndex);
    if (client?.id && this.shiftPreferencesDialog) {
      const name = [client.firstName, client.name].filter(Boolean).join(' ');
      this.shiftPreferencesDialog.open(client.id, name);
    }
  }

  protected onClientDrop(event: CdkDragDrop<IClientWork[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    const previousOrder = [...this.sortedClients];
    moveItemInArray(this.sortedClients, event.previousIndex, event.currentIndex);
    this.cdr.markForCheck();

    const groupId = this.dataManagementSchedule.workFilter.selectedGroup;
    if (!groupId) return;

    void this.clientSortPreference.save(groupId, this.sortedClients).catch(() => {
      this.sortedClients = previousOrder;
      this.cdr.markForCheck();
      this.drawRowHeader.redraw();
      this.toastShow.showError('Failed to save client order. Please try again.');
    });

    this.drawRowHeader.redraw();
  }

  onFilterMouseLeave(): void {
    this.destroyFilter();
  }

  onCanvasMouseLeave(): void {
    this.tooltipHelper.hide();
  }

  onFilterChange(): void {
    this.dataManagementSchedule.readWorkSchedule(false);
  }

  private showFilter(): void {
    const canvas = this.drawRowHeader.canvas;
    if (!canvas) return;

    const isRtl = document.documentElement.dir === 'rtl';
    const rect = canvas.getBoundingClientRect();
    const icon = this.drawRowHeader.recFilterIcon;
    const iconRight = rect.left + icon.left + icon.width;
    const iconBottom = rect.top + icon.top + icon.height;

    this.filterStyle = {
      visibility: 'hidden',
      ...(isRtl ? { right: '0px' } : { left: '0px' }),
      top: iconBottom + 'px',
    };

    requestAnimationFrame(() => {
      const el = this.filterEl()?.nativeElement;
      const popupWidth = el?.offsetWidth ?? 0;
      const viewportWidth = window.innerWidth;

      if (isRtl) {
        let left = rect.left + icon.left;
        if (left + popupWidth > viewportWidth) left = viewportWidth - popupWidth;
        if (left < 0) left = 0;
        this.filterStyle = {
          visibility: 'visible',
          left: left + 'px',
          top: iconBottom + 'px',
        };
      } else {
        let left = iconRight - popupWidth;
        if (left < 0) left = 0;
        this.filterStyle = {
          visibility: 'visible',
          left: left + 'px',
          top: iconBottom + 'px',
        };
      }
      this.cdr.markForCheck();
    });
  }

  private destroyFilter(): void {
    this.filterStyle = {
      visibility: 'hidden',
    };
  }
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Stand-alone row header for the timeline view.
 * Shares the shared draw engine with the tabular view but swaps in the
 * timeline-specific create-row-header service so the cell gets a 24h ruler
 * appended on the right. Supports the same context-menu actions as the
 * tabular row header (address navigation, reports, shift preferences).
 * @param drawRowHeader - Reused draw engine (BaseDrawRowHeaderService)
 * @param settings - Grid settings (cell height, zoom, timeline flag)
 * @param valueChangeVScrollbar - Vertical scroll position pushed in by the parent
 */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EffectRef,
  ElementRef,
  inject,
  Injector,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  effect,
  runInInjectionContext,
  viewChild,
  input
} from '@angular/core';
import { NgStyle } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ResizeDirective } from 'src/app/presentation/directives/resize.directive';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { ScrollEventService } from 'src/app/presentation/shared/scrollbar/scroll-event.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseCreateRowHeaderService } from '../../services/create-row-header.service';
import { BaseDrawRowHeaderService } from '../../services/draw-row-header.service';
import { ProgressBarAnimationService } from 'src/app/presentation/shared/grid/services/progress-bar-animation.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { WorkScheduleLoaderService } from 'src/app/domain/services/schedule/work-schedule-loader.service';
import { RowHeaderIconsService } from 'src/app/presentation/shared/grid/services/row-header-icons.service';
import { ClientFilterComponent } from 'src/app/presentation/shared/client-filter/client-filter.component';
import { CursorEnum } from 'src/app/presentation/shared/grid/enums/cursor_enums';
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { MyPosition } from 'src/app/presentation/shared/grid/classes/position';
import { IScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';
import { ScheduleDataService } from '../../services/schedule-data.service';
import { TimelineCreateRowHeaderService } from '../services/timeline-create-row-header.service';
import { TimelineSelectionService } from '../services/timeline-selection.service';
import { ContextMenuComponent } from 'src/app/presentation/shared/context-menu/context-menu.component';
import { ContextMenuService } from 'src/app/presentation/shared/context-menu/context-menu.service';
import { RowHeaderReportService } from '../../schedule-schedule-row-header/row-header-report.service';
import { ShiftPreferencesDialogComponent } from '../../../dialogs/shift-preferences-dialog/shift-preferences-dialog.component';

@Component({
  selector: 'app-schedule-timeline-row-header',
  templateUrl: './schedule-timeline-row-header.component.html',
  styleUrls: ['./schedule-timeline-row-header.component.scss'],
  standalone: true,
  imports: [NgStyle, ResizeDirective, ClientFilterComponent, ContextMenuComponent, ShiftPreferencesDialogComponent],
  providers: [
    { provide: BaseCreateRowHeaderService, useClass: TimelineCreateRowHeaderService },
    BaseDrawRowHeaderService,
    ProgressBarAnimationService,
    ContextMenuService,
    RowHeaderReportService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleTimelineRowHeaderComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  readonly boxElement = viewChild.required<ElementRef<HTMLDivElement>>('box');
  readonly contextMenu = viewChild.required<ContextMenuComponent>('contextMenu');
  readonly shiftPreferencesDialog = viewChild.required(ShiftPreferencesDialogComponent);

  readonly valueChangeVScrollbar = input.required<number>();

  public dataService = inject(BaseDataService);
  public scroll = inject(ScrollService);
  public drawRowHeader = inject(BaseDrawRowHeaderService);
  public dataManagementSchedule = inject(DataManagementScheduleService);
  private workScheduleLoader = inject(WorkScheduleLoaderService);
  private injector = inject(Injector);
  private settings = inject(BaseSettingsService);
  private scrollEventService = inject(ScrollEventService);
  private rowHeaderIcons = inject(RowHeaderIconsService);
  private cellManipulation = inject(BaseCellManipulationService);
  private timelineSelection = inject(TimelineSelectionService);
  private reportHelper = inject(RowHeaderReportService);
  private cdr = inject(ChangeDetectorRef);

  private ngUnsubscribe = new Subject<void>();
  private effects: EffectRef[] = [];
  private isDestroyed = false;
  private pixelRatio = 1;
  private pixelRatioMql?: MediaQueryList;
  private pixelRatioListener?: () => void;
  private contextMenuRow = -1;

  filterStyle: Record<string, string> = { visibility: 'hidden' };
  private filterEl = viewChild<ElementRef>('filterEl');

  private set currentCursor(cursor: CursorEnum) {
    document.body.style.cursor = cursor;
  }

  ngOnInit(): void {
    this.destroyFilter();
    this.drawRowHeader.filterImage = this.rowHeaderIcons.sortingPicto;
    this.pixelRatio = DrawHelper.pixelRatio();
    this.registerPixelRatioListener();
    this.reportHelper.loadDefaults();
  }

  ngAfterViewInit(): void {
    this.initializeDrawRowHeader();
    this.registerSignalEffects();

    this.contextMenu()?.hasClicked
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((keys) => {
        this.menuClicked(keys);
      });
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this.unregisterPixelRatioListener();
    this.drawRowHeader.deleteCanvas();
    this.effects.forEach((e) => e?.destroy());
    this.effects = [];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['valueChangeVScrollbar']) {
      this.scroll.verticalScrollPosition =
        changes['valueChangeVScrollbar'].currentValue;
    }
  }

  onResize(entries: ResizeObserverEntry[]): void {
    if (entries && entries.length > 0) {
      this.updateDrawRowHeaderDimensions(entries[0].target as HTMLElement);
      this.drawRowHeader.refresh();
      this.checkPixelRatio();
    }
  }

  onMouseMove(event: MouseEvent): void {
    const pos = this.getMousePos(event);
    if (!pos) return;

    if (this.drawRowHeader.recFilterIcon) {
      if (this.drawRowHeader.recFilterIcon.pointInRect(pos.x, pos.y)) {
        this.currentCursor = CursorEnum.pointer;
        return;
      }
      this.currentCursor = CursorEnum.default;
    }
  }

  onCanvasMouseLeave(): void {
    this.currentCursor = CursorEnum.default;
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
    const contextMenu = this.contextMenu();
    if (!contextMenu) return;

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
    contextMenu.menuData = this.reportHelper.createContextMenu();

    contextMenu.openMenu({
      clientX: event.clientX,
      clientY: event.clientY,
    } as MouseEvent);
  }

  private menuClicked(keys: string[]): void {
    if (!keys || keys.length === 0) return;

    switch (keys[0]) {
      case 'goToAddress':
        this.contextMenu().closeMenu(true);
        this.reportHelper.navigateToAddress(this.contextMenuRow);
        break;
      case 'staffSchedule':
        this.contextMenu().closeMenu(true);
        this.reportHelper.generateStaffSchedule(this.contextMenuRow);
        break;
      case 'sendStaffSchedule':
        this.contextMenu().closeMenu(true);
        this.reportHelper.sendStaffSchedule(this.contextMenuRow);
        break;
      case 'shiftPreferences':
        this.contextMenu().closeMenu(true);
        this.openShiftPreferencesDialog(this.contextMenuRow);
        break;
    }
  }

  private openShiftPreferencesDialog(row: number): void {
    if (row < 0 || row >= this.dataService.rows) return;

    const groupIndex = this.dataService.rowGroupIndex[row];
    if (groupIndex === undefined) return;

    const client = this.dataService.getGroupIndex(groupIndex);
    const shiftPreferencesDialog = this.shiftPreferencesDialog();
    if (client?.id && shiftPreferencesDialog) {
      const name = [client.firstName, client.name].filter(Boolean).join(' ');
      shiftPreferencesDialog.open(client.id, name);
    }
  }

  onFilterMouseLeave(): void {
    this.destroyFilter();
  }

  onFilterChange(): void {
    const previousBlock = this.timelineSelection.selectedBlock();
    const previousEntry = previousBlock?.entry;

    this.cellManipulation.Position = new MyPosition(-1, -1);
    this.cellManipulation.PositionCollection.clear();
    this.timelineSelection.clearBlock();

    this.dataManagementSchedule.readWorkSchedule(false, () => {
      if (previousEntry) {
        this.restoreSelection(previousEntry);
      }
    });
  }

  private restoreSelection(entry: IScheduleCell): void {
    const scheduleData = this.dataService as ScheduleDataService;
    const row = scheduleData.findRowByClientId(entry.clientId);
    if (row < 0) return;

    const entryDate =
      entry.entryDate instanceof Date
        ? entry.entryDate.toISOString()
        : String(entry.entryDate);
    const col = scheduleData.getColumnForDate(entryDate);
    if (col < 0) return;

    this.timelineSelection.selectBlock({ row, col, entry });
    this.cellManipulation.Position = new MyPosition(row, col);
  }

  private getMousePos(event: MouseEvent): { x: number; y: number } | undefined {
    if (!this.drawRowHeader.canvas) return undefined;
    const rect = this.drawRowHeader.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
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
    this.filterStyle = { visibility: 'hidden' };
  }

  private checkPixelRatio(): void {
    const current = DrawHelper.pixelRatio();
    if (this.pixelRatio !== current && this.drawRowHeader.isCanvasAvailable()) {
      this.pixelRatio = current;
      this.drawRowHeader.createCanvas();
      this.drawRowHeader.rebuild();
      this.drawRowHeader.redraw();
    }
  }

  private registerPixelRatioListener(): void {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    this.pixelRatioMql = window.matchMedia(
      `(resolution: ${window.devicePixelRatio}dppx)`,
    );
    this.pixelRatioListener = () => {
      if (this.isDestroyed) {
        return;
      }
      this.checkPixelRatio();
      this.unregisterPixelRatioListener();
      this.registerPixelRatioListener();
    };
    this.pixelRatioMql.addEventListener('change', this.pixelRatioListener);
  }

  private unregisterPixelRatioListener(): void {
    if (this.pixelRatioMql && this.pixelRatioListener) {
      this.pixelRatioMql.removeEventListener('change', this.pixelRatioListener);
    }
    this.pixelRatioMql = undefined;
    this.pixelRatioListener = undefined;
  }

  private initializeDrawRowHeader(): void {
    this.updateDrawRowHeaderDimensions();
    this.drawRowHeader.createCanvas();
  }

  private updateDrawRowHeaderDimensions(element?: Element): void {
    const box = element ?? this.boxElement().nativeElement;
    this.drawRowHeader.width = box.clientWidth;
    this.drawRowHeader.height = box.clientHeight;
  }

  private registerSignalEffects(): void {
    runInInjectionContext(this.injector, () => {
      this.effects.push(
        effect(() => {
          this.settings.zoomSignal();
          setTimeout(() => {
            if (this.isDestroyed) return;
            if (this.drawRowHeader.isCanvasAvailable()) {
              this.drawRowHeader.createCanvas();
              this.drawRowHeader.rebuild();
              this.drawRowHeader.redraw();
            }
          }, 0);
        }),
      );

      this.effects.push(
        effect(() => {
          this.drawRowHeader.cellManipulation.positionSignal();
          if (this.drawRowHeader.isCanvasAvailable()) {
            this.drawRowHeader.drawRowHeaderSelection();
          }
        }),
      );

      this.effects.push(
        effect(() => {
          this.dataService.refreshSignal();
          if (this.drawRowHeader.isCanvasAvailable()) {
            this.drawRowHeader.redraw();
          }
        }),
      );

      this.effects.push(
        effect(() => {
          this.scrollEventService.scrollPosition();
          if (this.drawRowHeader.isCanvasAvailable()) {
            this.drawRowHeader.moveGrid();
          }
        }),
      );

      this.effects.push(
        effect(() => {
          const readState = this.dataManagementSchedule.isRead();
          if (readState.count > 0 && this.drawRowHeader.isCanvasAvailable()) {
            this.drawRowHeader.redraw();
          }
        }),
      );

      this.effects.push(
        effect(() => {
          this.settings.timelineMode();
          setTimeout(() => {
            if (this.isDestroyed) return;
            if (this.drawRowHeader.isCanvasAvailable()) {
              this.drawRowHeader.createCanvas();
              this.drawRowHeader.rebuild();
              this.drawRowHeader.redraw();
            }
          }, 0);
        }),
      );

      this.effects.push(
        effect(() => {
          this.settings.timelineRowHeightSignal();
          setTimeout(() => {
            if (this.isDestroyed) return;
            if (this.drawRowHeader.isCanvasAvailable()) {
              this.drawRowHeader.createCanvas();
              this.drawRowHeader.rebuild();
              this.drawRowHeader.redraw();
            }
          }, 0);
        }),
      );

      this.effects.push(
        effect(() => {
          const _t = this.workScheduleLoader.periodHoursUpdated();
          if (this.drawRowHeader.isCanvasAvailable()) {
            this.drawRowHeader.redraw();
          }
        }),
      );
    });
  }
}

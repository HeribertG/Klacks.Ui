// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EffectRef,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  effect,
  inject,
  runInInjectionContext,
  viewChild,
  input
} from '@angular/core';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/break/data-management-break-placeholder.service';
import { ClientFilterComponent } from 'src/app/presentation/shared/client-filter/client-filter.component';
import { Subject } from 'rxjs';
import { DrawCalendarGanttService } from 'src/app/presentation/workplace/absence-gantt/services/draw-calendar-gantt.service';
import { DrawRowHeaderService } from '../services/draw-row-header.service';
import { CanvasAvailable } from 'src/app/domain/services/canvasAvailable.decorator';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { RowHeaderIconsService } from 'src/app/presentation/shared/grid/services/row-header-icons.service';
import { NgStyle } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntil } from 'rxjs';
import { ResizeDirective } from 'src/app/presentation/directives/resize.directive';
import { CursorEnum } from 'src/app/presentation/shared/grid/enums/cursor_enums';
import { ProgressBarAnimationService } from 'src/app/presentation/shared/grid/services/progress-bar-animation.service';
import { ContextMenuComponent } from 'src/app/presentation/shared/context-menu/context-menu.component';
import { ContextMenuService } from 'src/app/presentation/shared/context-menu/context-menu.service';
import { Menu } from 'src/app/presentation/shared/context-menu/context-menu-class';
import { MenuDataTemplate } from 'src/app/presentation/helpers/context-menu-data-template';

@Component({
  selector: 'app-absence-gantt-row-header',
  templateUrl: './absence-gantt-row-header.component.html',
  styleUrls: ['./absence-gantt-row-header.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgStyle, ClientFilterComponent, ResizeDirective, ContextMenuComponent],
  providers: [ProgressBarAnimationService, ContextMenuService],
})
export class AbsenceGanttRowHeaderComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  readonly valueChangeVScrollbar = input.required<number>();

  readonly boxCalendarRowHeader = viewChild.required<ElementRef<HTMLDivElement>>('boxCalendarRowHeader');
  readonly contextMenu = viewChild.required<ContextMenuComponent>('contextMenu');

  public scroll = inject(ScrollService);
  public dataManagementBreak = inject(DataManagementBreakPlaceholderService);
  private gridColorService = inject(GridColorService);
  private gridFontsService = inject(GridFontsService);
  private drawCalendarGanttService = inject(DrawCalendarGanttService);
  private drawRowHeader = inject(DrawRowHeaderService);
  private rowHeaderIcons = inject(RowHeaderIconsService);
  private router = inject(Router);
  private injector = inject(Injector);
  private cdr = inject(ChangeDetectorRef);

  private ngUnsubscribe = new Subject<void>();
  private effects: EffectRef[] = [];

  filterStyle: Record<string, string> = { visibility: 'hidden' };
  private filterEl = viewChild<ElementRef>('filterEl');
  private contextMenuRow = -1;

  /* #region dom */
  private set currentCursor(cursor: CursorEnum) {
    document.body.style.cursor = cursor;
  }

  private get currentCursor(): CursorEnum {
    return document.body.style.cursor as CursorEnum;
  }
  /* #endregion dom */

  /* #region ng */

  ngOnInit(): void {
    this.readSignals();
    this.destroyFilter();
    this.drawCalendarGanttService.pixelRatio = DrawHelper.pixelRatio();

    this.drawRowHeader.filterImage = this.rowHeaderIcons.sortingPicto;

    const loader = this.dataManagementBreak;
    this.drawRowHeader.setProgressBarLoader({
      get isRead() { return loader.isRead; },
      get loadingProgress() { return loader.loadingProgress; },
      get hasMore() { return loader.hasMoreRows; },
    });

    this.drawRowHeader.createCanvas();
  }

  ngAfterViewInit(): void {
    this.initializeDrawRowHeader();

    this.contextMenu()?.hasClicked
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((keys) => {
        this.menuClicked(keys);
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();

    this.effects.forEach((effectRef) => {
      if (effectRef) {
        effectRef.destroy();
      }
    });
    this.effects = [];

    this.drawRowHeader.destroy();
    this.drawRowHeader.deleteCanvas();
  }

  private initializeDrawRowHeader(): void {
    const box = this.boxCalendarRowHeader().nativeElement;
    this.drawRowHeader.height = box.clientHeight;
    this.drawRowHeader.width = box.clientWidth;
    this.drawRowHeader.createCanvas();
  }

  /* #endregion ng */

  /* #region resize+visibility */
  onResize(entries: ResizeObserverEntry[]): void {
    if (entries && entries.length > 0) {
      const entry = entries[0];
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.updateDrawRowHeaderDimensions(entry.target as HTMLElement);
          this.checkPixelRatio();
          this.redrawComponents();
        });
      });
    }
  }

  private checkPixelRatio(): void {
    const pixelRatio = DrawHelper.pixelRatio();
    if (this.drawCalendarGanttService.pixelRatio !== pixelRatio) {
      this.drawRowHeader.deleteCanvas();
      this.drawRowHeader.createCanvas();
      this.drawCalendarGanttService.pixelRatio = pixelRatio;
    }
  }

  isCanvasAvailable(): boolean {
    return this.drawRowHeader.isCanvasAvailable();
  }
  @CanvasAvailable()
  private redrawComponents(): void {
    this.drawRowHeader.createRuler();
    this.drawRowHeader.renderRowHeader();
    this.drawRowHeader.drawCalendar();
  }

  private updateDrawRowHeaderDimensions(element: HTMLElement): void {
    this.drawRowHeader.height = element.clientHeight;
    this.drawRowHeader.width = element.clientWidth;
  }

  /* #endregion resize+visibility */

  /* #region   mouse event */

  private getMousePos(event: MouseEvent) {
    if (!this.drawRowHeader.rowHeaderCanvasManager.canvas) return;

    const rect =
      this.drawRowHeader.rowHeaderCanvasManager.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  onMouseMove(event: MouseEvent) {
    const pos = this.getMousePos(event);
    if (!pos) return;

    if (this.drawRowHeader.recFilterIcon) {
      if (this.drawRowHeader.recFilterIcon.pointInRect(pos.x, pos.y)) {
        this.currentCursor = CursorEnum.pointer;
      } else {
        this.currentCursor = CursorEnum.default;
      }
    }
  }

  onClick(event: MouseEvent) {
    const pos = this.getMousePos(event);
    if (!pos) return;
    if (this.drawRowHeader.recFilterIcon) {
      if (this.drawRowHeader.recFilterIcon.pointInRect(pos.x, pos.y)) {
        this.showFilter();
      }
    }
  }

  onMouseLeave() {
    this.destroyFilter();
  }

  onRightClick(event: MouseEvent): void {
    event.preventDefault();
    const contextMenu = this.contextMenu();
    if (!contextMenu) return;

    const pos = this.getMousePos(event);
    if (!pos) return;

    const row =
      Math.floor(
        (pos.y - this.drawRowHeader.calendarSetting.cellHeaderHeight) /
          this.drawRowHeader.calendarSetting.cellHeight,
      ) + this.scroll.verticalScrollPosition;

    if (row < 0 || row >= this.dataManagementBreak.rows) {
      return;
    }

    const clientId = this.dataManagementBreak.readClientId(row);
    if (!clientId) {
      return;
    }

    this.contextMenuRow = row;
    const menuData = new Menu();
    menuData.list.push(...MenuDataTemplate.goToAddress());
    contextMenu.menuData = menuData;

    contextMenu.openMenu({
      clientX: event.clientX,
      clientY: event.clientY,
    } as MouseEvent);
  }

  private menuClicked(keys: string[]): void {
    if (!keys || keys.length === 0) return;

    if (keys[0] === 'goToAddress') {
      this.contextMenu().closeMenu(true);
      const clientId = this.dataManagementBreak.readClientId(this.contextMenuRow);
      if (clientId) {
        this.router.navigate(['/workplace/edit-address', clientId], {
          queryParams: { returnUrl: '/workplace/absence' },
        });
      }
    }
  }

  /* #endregion   mouse event */

  /* #region Filter */

  showFilter() {
    const canvas = this.drawRowHeader.rowHeaderCanvasManager.canvas;
    if (!canvas) return;

    const isRtl = document.documentElement.dir === 'rtl';
    const rect = canvas.getBoundingClientRect();
    const icon = this.drawRowHeader.recFilterIcon;
    const iconRight = rect.left + icon.left + icon.width;
    const iconBottom = rect.top + icon.top + icon.height;

    this.filterStyle = { visibility: 'hidden', ...(isRtl ? { right: '0px' } : { left: '0px' }), top: iconBottom + 'px' };

    requestAnimationFrame(() => {
      const el = this.filterEl()?.nativeElement;
      const popupWidth = el?.offsetWidth ?? 0;
      const viewportWidth = window.innerWidth;

      if (isRtl) {
        let left = rect.left + icon.left;
        if (left + popupWidth > viewportWidth) left = viewportWidth - popupWidth;
        if (left < 0) left = 0;
        this.filterStyle = { visibility: 'visible', left: left + 'px', top: iconBottom + 'px' };
      } else {
        let left = iconRight - popupWidth;
        if (left < 0) left = 0;
        this.filterStyle = { visibility: 'visible', left: left + 'px', top: iconBottom + 'px' };
      }
      this.cdr.markForCheck();
    });
  }

  destroyFilter() {
    this.filterStyle = {
      visibility: 'hidden',
    };
  }

  onFilterChange(): void {
    this.dataManagementBreak.reRead();
  }

  /* #endregion Filter */

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      const effect1 = effect(() => {
        const isRead = this.dataManagementBreak.isRead();
        if (isRead) {
          if (!this.drawRowHeader.isCanvasAvailable()) {
            return;
          }

          this.drawRowHeader.createRuler();
          this.drawRowHeader.renderRowHeader();
          this.drawRowHeader.drawCalendar();
        }
      });
      this.effects.push(effect1);

      const effect2 = effect(() => {
        const isReset = this.gridColorService.isReset();
        if (isReset) {
          const icon = this.rowHeaderIcons.sortingPicto;
          if (icon) {
            this.drawRowHeader.filterImage = icon;
          }
          this.onResize([]);
        }
      });
      this.effects.push(effect2);

      const effect3 = effect(() => {
        const isReset = this.gridFontsService.isReset();
        if (isReset) {
          this.onResize([]);
        }
      });
      this.effects.push(effect3);

      let lastVScroll: number | undefined;
      const vScrollEffect = effect(() => {
        const currentValue = this.valueChangeVScrollbar();
        const diff = lastVScroll === undefined ? 0 : currentValue - lastVScroll;
        lastVScroll = currentValue;
        if (diff) {
          setTimeout(() => {
            this.drawRowHeader.moveRow(diff);
            this.cdr.markForCheck();
          }, 50);
        }
      });
      this.effects.push(vScrollEffect);
    });
  }
}

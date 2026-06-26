// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Component rendering the row headers for the shift grid.
 * Displays shift information (name, abbreviation, icons) in a fixed left column.
 * Handles scrolling synchronization with the main shift grid.
 *
 * @relations
 * - Parent: ShiftSectionComponent
 * - Uses: ShiftDrawRowHeaderService for rendering
 * - Uses: ShiftCreateRowHeaderService for content creation
 */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  EffectRef,
  ElementRef,
  inject,
  Injector,
  OnChanges,
  OnDestroy,
  runInInjectionContext,
  SimpleChanges,
  effect,
  input,
  viewChild
} from '@angular/core';
import { Subject } from 'rxjs';
import { ResizeDirective } from 'src/app/presentation/directives/resize.directive';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { ScrollEventService } from 'src/app/presentation/shared/scrollbar/scroll-event.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ShiftRowHeaderCanvasService } from './services/shift-row-header-canvas.service';
import { ShiftCreateRowHeaderService } from './services/shift-create-row-header.service';
import { ShiftDrawRowHeaderService } from './services/shift-draw-row-header.service';
import { ShiftRowHeaderIconsService } from './services/shift-row-header-icons.service';
import { ShiftRowHeaderEventsDirective } from './directives/shift-row-header-events.directive';
import { ShiftRowHeaderTooltipService } from './services/shift-row-header-tooltip.service';
import { ProgressBarAnimationService } from 'src/app/presentation/shared/grid/services/progress-bar-animation.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';

@Component({
  selector: 'app-schedule-shift-row-header',
  templateUrl: './schedule-shift-row-header.component.html',
  styleUrls: ['./schedule-shift-row-header.component.scss'],
  standalone: true,
  imports: [ResizeDirective, ShiftRowHeaderEventsDirective],
  providers: [
    ShiftRowHeaderCanvasService,
    ShiftCreateRowHeaderService,
    ShiftDrawRowHeaderService,
    ShiftRowHeaderIconsService,
    ShiftRowHeaderTooltipService,
    ProgressBarAnimationService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleShiftRowHeaderComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  readonly boxElement = viewChild.required<ElementRef<HTMLDivElement>>('box');

  readonly valueChangeVScrollbar = input.required<number>();
  readonly selectedRow = input(-1);
  readonly isSelectedRowActive = input(false);

  private injector = inject(Injector);
  private scroll = inject(ScrollService);
  private scrollEventService = inject(ScrollEventService);
  private drawRowHeader = inject(ShiftDrawRowHeaderService);
  private dataService = inject(BaseDataService);
  private settings = inject(BaseSettingsService);
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private gridColorService = inject(GridColorService);
  private tooltipHelper = inject(ShiftRowHeaderTooltipService);

  private ngUnsubscribe = new Subject<void>();
  private effects: EffectRef[] = [];

  ngAfterViewInit(): void {
    this.initializeDrawRowHeader();
    this.readSignals();
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
    if (changes['valueChangeVScrollbar']) {
      const prevV = changes['valueChangeVScrollbar'].previousValue;
      const currV = changes['valueChangeVScrollbar'].currentValue;
      if (currV !== prevV) {
        this.scroll.verticalScrollPosition = currV;
      }
    }
    if (changes['selectedRow'] || changes['isSelectedRowActive']) {
      this.drawRowHeader.selectedRow = this.selectedRow();
      this.drawRowHeader.isSelectedRowActive = this.isSelectedRowActive();
      if (this.drawRowHeader.isCanvasAvailable()) {
        this.drawRowHeader.refresh();
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

  onCanvasMouseMove(event: MouseEvent): void {
    const canvas = this.drawRowHeader.canvas;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pos = { x: event.clientX - rect.left, y: event.clientY - rect.top };

    if (!this.tooltipHelper.checkQualificationTooltip(event, pos, canvas)) {
      this.tooltipHelper.hide();
    }
  }

  onCanvasMouseLeave(): void {
    this.tooltipHelper.hide();
  }

  private initializeDrawRowHeader(): void {
    this.updateDrawRowHeaderDimensions();
    this.drawRowHeader.createCanvas();
  }

  private updateDrawRowHeaderDimensions(element?: Element): void {
    const box = element || this.boxElement().nativeElement;
    this.drawRowHeader.width = box.clientWidth;
    this.drawRowHeader.height = box.clientHeight;
  }

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      const refreshEffect = effect(() => {
        this.dataService.refreshSignal();
        if (this.drawRowHeader.isCanvasAvailable()) {
          this.drawRowHeader.redraw();
        }
      });
      this.effects.push(refreshEffect);

      const dataReadEffect = effect(() => {
        const readState = this.dataManagementSchedule.isShiftScheduleRead();
        if (readState.count > 0) {
          this.drawRowHeader.redraw();
        }
      });
      this.effects.push(dataReadEffect);

      const scrollEffect = effect(() => {
        this.scrollEventService.scrollPosition();
        if (this.drawRowHeader.isCanvasAvailable()) {
          this.drawRowHeader.moveGrid();
        }
      });
      this.effects.push(scrollEffect);

      const zoomEffect = effect(() => {
        this.settings.zoomSignal();
        if (this.drawRowHeader.isCanvasAvailable()) {
          this.drawRowHeader.redraw();
        }
      });
      this.effects.push(zoomEffect);

      const colorResetEffect = effect(() => {
        if (this.gridColorService.isReset()) {
          this.drawRowHeader.redraw();
        }
      });
      this.effects.push(colorResetEffect);
    });
  }
}

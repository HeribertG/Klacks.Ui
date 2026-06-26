// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Surface renderer for the timeline view.
 * Stands alone (no extends) so it does not pull the table-specific directives
 * that carry the GridSurfaceTemplateComponent dependency cycle.
 * Canvas, scroll and draw-schedule wiring mirrors the minimal subset required
 * to visualise the Work / Break / Expenses blocks.
 * @param drawSchedule - Draw engine for the grid content (reused from shared grid services)
 * @param scroll - Shared scroll state with the row header
 * @param settings - Grid settings (cell dimensions, zoom, timeline flag)
 */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EffectRef,
  ElementRef,
  Injector,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  effect,
  inject,
  runInInjectionContext,
  input,
  output
} from '@angular/core';
import { IScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseDrawScheduleService } from 'src/app/presentation/shared/grid/services/body/draw-schedule.service';
import { BaseCreateCellService } from 'src/app/presentation/shared/grid/services/body/create-cell.service';
import { BaseCreateHeaderService } from 'src/app/presentation/shared/grid/services/body/create-header.service';
import { BaseCellRenderService } from 'src/app/presentation/shared/grid/services/body/cell-render.service';
import { BaseCanvasManagerService } from 'src/app/presentation/shared/grid/services/body/canvas-manager.service';
import { BaseGridRenderService } from 'src/app/presentation/shared/grid/services/body/grid-render.service';
import { CellIconsService } from 'src/app/presentation/shared/grid/services/body/cell-icons.service';
import { TimelineCreateCellService } from '../services/timeline-create-cell.service';
import { TimelineSelectionService } from '../services/timeline-selection.service';
import { TimelineBlockHitTestService } from '../services/timeline-block-hit-test.service';
import { TimelineBlockTooltipService } from '../services/timeline-block-tooltip.service';
import { TimelineSelectionOverlayService } from '../services/timeline-selection-overlay.service';
import { WorkBlockRendererService } from '../renderers/work-block-renderer.service';
import { WorkChangeBlockRendererService } from '../renderers/work-change-block-renderer.service';
import { BreakBlockRendererService } from '../renderers/break-block-renderer.service';
import { TooltipService } from 'src/app/presentation/shared/tooltip/tooltip.service';
import { IGridTooltipHost } from 'src/app/presentation/shared/grid/body/grid-tooltip-host.interface';
import {
  TimelineGridBlockEvent,
  TimelineGridEventsDirective,
  TimelineGridRightClickEvent,
} from '../directives/timeline-grid-events.directive';

export interface TimelineCellValueChangeEvent {
  row: number;
  column: number;
  value: string;
}

export interface TimelineDoubleClickEvent {
  row: number;
  column: number;
  entry?: IScheduleCell | null;
}

@Component({
  selector: 'app-grid-surface-timeline-template',
  template: `
    <div #boxTemplate class="box-template">
      <canvas
        #canvasTemplateRef
        appTimelineGridEvents
        id="timeline-template-canvas{{ canvasId }}"
        [tabindex]="0"
        (rightClick)="onCanvasRightClick($event)"
        (wheelScroll)="onWheelScroll($event)"
        (workDoubleClick)="onWorkDouble($event)"
        (workChangeDoubleClick)="onWorkChangeDouble($event)"
        (containerWorkDoubleClick)="onContainerWorkDouble($event)"
        (deleteKey)="onDeleteKey($event)"
      ></canvas>
    </div>
  `,
  styles: [
    `
      .box-template {
        width: 100%;
        height: 100%;
        position: relative;
      }
      canvas {
        display: block;
        outline: none;
      }
    `,
  ],
  standalone: true,
  imports: [TimelineGridEventsDirective],
  providers: [
    { provide: BaseCreateCellService, useClass: TimelineCreateCellService },
    BaseDrawScheduleService,
    BaseCreateHeaderService,
    BaseCellRenderService,
    BaseCanvasManagerService,
    BaseGridRenderService,
    CellIconsService,
    WorkBlockRendererService,
    WorkChangeBlockRendererService,
    BreakBlockRendererService,
    TimelineBlockHitTestService,
    TimelineBlockTooltipService,
    TimelineSelectionOverlayService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GridSurfaceTimelineTemplateComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy, IGridTooltipHost
{
  readonly nameId = input('surface');
  readonly valueChangeHScrollbar = input.required<number>();
  readonly valueChangeVScrollbar = input.required<number>();

  readonly valueHScrollbar = output<number>();
  readonly maxValueHScrollbar = output<number>();
  readonly visibleValueHScrollbar = output<number>();
  readonly valueVScrollbar = output<number>();
  readonly maxValueVScrollbar = output<number>();
  readonly visibleValueVScrollbar = output<number>();
  readonly cellValueChange = output<TimelineCellValueChangeEvent>();
  readonly rightClick = output<TimelineGridRightClickEvent & {
    source: 'canvas';
}>();
  readonly workChangeDoubleClick = output<TimelineDoubleClickEvent>();
  readonly workDoubleClick = output<TimelineDoubleClickEvent>();
  readonly containerWorkDoubleClick = output<TimelineDoubleClickEvent>();
  readonly deleteBlock = output<TimelineDoubleClickEvent>();

  @ViewChild('boxTemplate') boxTemplate!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasTemplateRef', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  public dataService = inject(BaseDataService);
  public scroll = inject(ScrollService);
  public drawSchedule = inject(BaseDrawScheduleService);
  public settings = inject(BaseSettingsService);
  private gridRender = inject(BaseGridRenderService);
  private selectionOverlay = inject(TimelineSelectionOverlayService);
  private selection = inject(TimelineSelectionService);
  private tooltipService = inject(TooltipService);
  private injector = inject(Injector);
  private cdr = inject(ChangeDetectorRef);

  public canvasId = `-${Math.random().toString(36).substring(2, 10)}`;
  private effects: EffectRef[] = [];
  private resizeObserver?: ResizeObserver;
  private isDestroyed = false;
  private pixelRatio = 1;
  private pixelRatioMql?: MediaQueryList;
  private pixelRatioListener?: () => void;
  private resizePending = false;

  ngOnInit(): void {
    this.registerSignalEffects();
    this.pixelRatio = DrawHelper.pixelRatio();
    this.registerPixelRatioListener();
  }

  ngAfterViewInit(): void {
    this.drawSchedule.init('timeline-template-canvas' + this.canvasId);
    this.gridRender.overlayRenderer = (ctx) => this.selectionOverlay.renderSelection(ctx);
    this.initializeDrawSchedule();
    this.observeParentResize();
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.unregisterPixelRatioListener();
    this.drawSchedule.deleteCanvas();
    this.effects.forEach((e) => e?.destroy());
    this.resizeObserver?.disconnect();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['valueChangeHScrollbar']) {
      const currH = changes['valueChangeHScrollbar'].currentValue;
      if (currH > this.scroll.maxCols) {
        this.scroll.maxCols = currH + 10;
      }
      this.scroll.horizontalScrollPosition = currH;
      this.drawSchedule.moveGrid();
    }
    if (changes['valueChangeVScrollbar']) {
      this.scroll.verticalScrollPosition =
        changes['valueChangeVScrollbar'].currentValue;
      this.drawSchedule.moveGrid();
    }
  }

  setFocus(): void {
    const canvas = this.canvasRef.nativeElement;
    if (canvas) {
      canvas.focus();
      this.drawSchedule.isFocused = true;
    }
  }

  Refresh(resetScroll = true): void {
    this.dataService.setMetrics();
    if (resetScroll) {
      this.scroll.horizontalScrollPosition = 0;
      this.scroll.verticalScrollPosition = 0;
      this.valueHScrollbar.emit(0);
      this.valueVScrollbar.emit(0);
    }
    this.drawSchedule.redraw();
    this.updateScrollbarValues();
  }

  showToolTip({ value, event }: { value: string; event: MouseEvent }): void {
    this.tooltipService.show({
      text: value,
      x: event.clientX,
      y: event.clientY,
    });
  }

  hideToolTip(): void {
    this.tooltipService.hide();
  }

  destroyToolTip(): void {
    this.tooltipService.hide();
  }

  onCanvasRightClick(event: TimelineGridRightClickEvent): void {
    this.rightClick.emit({ ...event, source: 'canvas' });
  }

  onWorkDouble(event: TimelineGridBlockEvent): void {
    this.workDoubleClick.emit({ row: event.row, column: event.column, entry: event.entry });
  }

  onWorkChangeDouble(event: TimelineGridBlockEvent): void {
    this.workChangeDoubleClick.emit({ row: event.row, column: event.column, entry: event.entry });
  }

  onContainerWorkDouble(event: TimelineGridBlockEvent): void {
    this.containerWorkDoubleClick.emit({ row: event.row, column: event.column, entry: event.entry });
  }

  onDeleteKey(event: TimelineGridBlockEvent): void {
    this.deleteBlock.emit({ row: event.row, column: event.column, entry: event.entry });
  }

  onWheelScroll(event: { deltaX: number; deltaY: number }): void {
    if (event.deltaX !== 0) {
      const next = (this.valueChangeHScrollbar() ?? 0) + event.deltaX;
      if (next >= 0) {
        this.valueHScrollbar.emit(next);
      }
    }
    if (event.deltaY !== 0) {
      const next = (this.valueChangeVScrollbar() ?? 0) + event.deltaY;
      if (next >= 0) {
        this.valueVScrollbar.emit(next);
      }
    }
  }

  private initializeDrawSchedule(): void {
    const box = this.boxTemplate.nativeElement;
    this.drawSchedule.createCanvas();
    this.drawSchedule.width = box.clientWidth;
    this.drawSchedule.height = box.clientHeight;
    this.drawSchedule.refresh();
    this.updateScrollbarValues();
  }

  private observeParentResize(): void {
    const parentElement = this.canvasRef.nativeElement.parentElement;
    if (parentElement && typeof window !== 'undefined' && 'ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.isDestroyed) return;
        if (this.resizePending) return;
        this.resizePending = true;
        requestAnimationFrame(() => {
          this.resizePending = false;
          if (this.isDestroyed) return;
          const box = this.boxTemplate.nativeElement;
          this.drawSchedule.width = box.clientWidth;
          this.drawSchedule.height = box.clientHeight;
          this.drawSchedule.refresh();
          this.checkPixelRatio();
          this.updateScrollbarValues();
        });
      });
      this.resizeObserver.observe(parentElement);
    }
  }

  private checkPixelRatio(): void {
    const current = DrawHelper.pixelRatio();
    if (this.pixelRatio !== current) {
      this.pixelRatio = current;
      this.drawSchedule.createCanvas();
      this.drawSchedule.rebuild();
      this.drawSchedule.redraw();
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

  private updateScrollbarValues(): void {
    this.maxValueHScrollbar.emit(this.dataService.columns);
    this.visibleValueHScrollbar.emit(
      Math.ceil(this.drawSchedule.width / this.settings.cellWidth),
    );
    this.maxValueVScrollbar.emit(this.dataService.rows);
    this.visibleValueVScrollbar.emit(
      Math.ceil(this.drawSchedule.height / this.settings.cellHeight),
    );
  }

  private registerSignalEffects(): void {
    runInInjectionContext(this.injector, () => {
      this.registerDeferredRebuildEffect(() => this.settings.zoomSignal());
      this.registerDeferredRebuildEffect(() => this.settings.timelineMode());
      this.registerDeferredRebuildEffect(() => this.settings.timelineRowHeightSignal());

      this.effects.push(
        effect(() => {
          this.dataService.refreshSignal();
          this.drawSchedule.rebuild();
          this.drawSchedule.redraw();
          this.updateScrollbarValues();
          this.cdr.detectChanges();
        }),
      );

      this.effects.push(
        effect(() => {
          this.selection.selectedBlock();
          if (this.isDestroyed) return;
          this.drawSchedule.refresh();
        }),
      );
    });
  }

  /**
   * Registers an effect that reads the given signal and, on a deferred
   * microtask, runs the full canvas rebuild sequence. Used for inputs
   * that change the canvas pixel layout (zoom, timelineMode, row-height
   * factor) where reading the new value synchronously inside the effect
   * would fight Angular's change-detection cycle.
   */
  private registerDeferredRebuildEffect(trigger: () => void): void {
    this.effects.push(
      effect(() => {
        trigger();
        setTimeout(() => {
          if (this.isDestroyed) return;
          this.drawSchedule.createCanvas();
          this.drawSchedule.rebuild();
          this.drawSchedule.redraw();
          this.updateScrollbarValues();
        }, 0);
      }),
    );
  }
}

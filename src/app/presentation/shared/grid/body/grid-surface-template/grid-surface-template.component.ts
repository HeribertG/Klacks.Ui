// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  AfterViewInit,
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
  ChangeDetectionStrategy,
  input,
  output
} from '@angular/core';
import { ContextMenuComponent } from 'src/app/presentation/shared/context-menu/context-menu.component';
import { SelectedArea } from 'src/app/presentation/shared/grid/enums/breaks_enums';
import { Subject } from 'rxjs';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseDrawScheduleService } from 'src/app/presentation/shared/grid/services/body/draw-schedule.service';
import {
  GridTemplateEventsDirective,
  GridRightClickEvent,
  GridDoubleClickEvent,
} from '../directives/grid-template-events.directive';
import { GridScheduleEventsService } from '../directives/grid-schedule-events.service';
import {
  CellInputEventsDirective,
  CellInputRightClickEvent,
} from '../directives/cell-input-events.directive';
import { BaseCellManipulationService } from '../../services/body/cell-manipulation.service';
import { GridFontsService } from '../../services/grid-fonts.service';
import { MyPosition } from '../../classes/position';
import { TooltipService } from '../../../tooltip/tooltip.service';
import { TestAccessibilityService } from '../../services/grid-test-accessibility/test-accessibility.service';
import { GridTestAccessibilityService } from '../../services/grid-test-accessibility/grid-test-accessibility.service';
import { GridFillHandleDragService } from '../../services/body/grid-fill-handle-drag.service';
import { GridCoordinateService } from '../../services/grid-coordinate.service';
import { IScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';
import { GridCellInputController } from './grid-cell-input.controller';
import { GridResizeController } from './grid-resize.controller';

export interface GridSurfaceRightClickEvent {
  row: number;
  column: number;
  clientX: number;
  clientY: number;
  source: 'canvas' | 'input';
  entry?: IScheduleCell | null;
}

export interface CellValueChangeEvent {
  row: number;
  column: number;
  value: string;
}

@Component({
  selector: 'app-grid-surface-template',
  templateUrl: './grid-surface-template.component.html',
  styleUrl: './grid-surface-template.component.scss',
  standalone: true,
  imports: [GridTemplateEventsDirective, CellInputEventsDirective],
  providers: [
    TestAccessibilityService,
    GridTestAccessibilityService,
    GridFillHandleDragService,
    GridScheduleEventsService,
    GridCellInputController,
    GridResizeController,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GridSurfaceTemplateComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  readonly contextMenu = input<ContextMenuComponent>();
  readonly valueChangeHScrollbar = input.required<number>();
  readonly valueChangeVScrollbar = input.required<number>();
  readonly nameId = input.required<string>();

  readonly valueHScrollbar = output<number>();
  readonly maxValueHScrollbar = output<number>();
  readonly visibleValueHScrollbar = output<number>();
  readonly valueVScrollbar = output<number>();
  readonly maxValueVScrollbar = output<number>();
  readonly visibleValueVScrollbar = output<number>();
  readonly cellValueChange = output<CellValueChangeEvent>();
  readonly rightClick = output<GridSurfaceRightClickEvent>();
  readonly workChangeDoubleClick = output<GridDoubleClickEvent>();
  readonly workDoubleClick = output<GridDoubleClickEvent>();
  readonly containerWorkDoubleClick = output<GridDoubleClickEvent>();

  @ViewChild('boxTemplate') boxTemplate!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasTemplateRef', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild(CellInputEventsDirective)
  cellInputDirective?: CellInputEventsDirective;

  public dataService = inject(BaseDataService);
  public scroll = inject(ScrollService);
  public drawSchedule = inject(BaseDrawScheduleService);
  public settings = inject(BaseSettingsService);
  private cellManipulation = inject(BaseCellManipulationService);
  private gridFonts = inject(GridFontsService);
  private tooltipService = inject(TooltipService);
  public testAccessibility = inject(TestAccessibilityService);
  private gridTestAccessibility = inject(GridTestAccessibilityService);
  private coord = inject(GridCoordinateService);

  private readonly el = inject<ElementRef<HTMLCanvasElement>>(ElementRef);
  private cdr = inject(ChangeDetectorRef);
  private injector = inject(Injector);

  // Test accessibility enabled state (delegated to GridTestAccessibilityService)
  get testAccessibilityEnabled() {
    return this.gridTestAccessibility.enabled;
  }

  public selectedArea: SelectedArea = SelectedArea.None;
  public isLeftMouseDown = false;
  public canvasId = `-${Math.random().toString(36).substring(2, 10)}`;

  public cellInput = inject(GridCellInputController);
  private resize = inject(GridResizeController);
  private ngUnsubscribe = new Subject<void>();
  private effects: EffectRef[] = [];
  private isDestroyed = false;

  private lastColumns = 0;
  private lastRows = 0;

  ngOnInit(): void {
    this.readSignals();
    this.gridTestAccessibility.initialize(
      this.dataService,
      this.scroll,
      {
        positionSignal: () => this.cellManipulation.positionSignal(),
        isEditing: () => this.cellManipulation.isEditing(),
        Position: this.cellManipulation.Position,
        setIsEditing: (value: boolean) =>
          this.cellManipulation.isEditing.set(value),
      },
      this.drawSchedule,
      this.settings,
    );
  }

  ngAfterViewInit(): void {
    this.drawSchedule.init('template-canvas' + this.canvasId);
    this.cellInput.setDirective(this.cellInputDirective);
    this.initializeDrawSchedule();
    this.observeParentResize();
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this.drawSchedule.deleteCanvas();
    this.effects.forEach((e) => e?.destroy());
    this.effects = [];
    this.resize.disconnect();
  }

  ngOnChanges(changes: SimpleChanges): void {
    let vDirection = false;
    let hDirection = false;

    if (changes['valueChangeHScrollbar']) {
      const prevH = changes['valueChangeHScrollbar'].previousValue;
      const currH = changes['valueChangeHScrollbar'].currentValue;
      if (currH !== prevH) {
        if (currH > this.scroll.maxCols) {
          this.scroll.maxCols = currH + 10;
        }
        this.scroll.horizontalScrollPosition = currH;
        this.scroll.updateScrollPosition(
          currH,
          this.scroll.verticalScrollPosition,
        );
        hDirection = true;
      }
    }

    if (changes['valueChangeVScrollbar']) {
      const prevV = changes['valueChangeVScrollbar'].previousValue;
      const currV = changes['valueChangeVScrollbar'].currentValue;
      if (currV !== prevV) {
        this.scroll.verticalScrollPosition = currV;
        this.scroll.updateScrollPosition(
          this.scroll.horizontalScrollPosition,
          currV,
        );
        vDirection = true;
      }
    }

    if (vDirection || hDirection) {
      this.drawSchedule.moveGrid();
      this.cellInput.refreshForScroll();
    }
  }

  setFocus(): void {
    const x = this.el.nativeElement;
    if (x) {
      x.focus();
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
    if (this.dataService.rows === 0) {
      this.cellManipulation.Position = new MyPosition(-1, -1);
      this.cellManipulation.PositionCollection.clear();
    }
    this.drawSchedule.redraw();
    this.updateScrollbarValues();
  }

  private observeParentResize(): void {
    this.resize.observeParent(this.el.nativeElement.parentElement, {
      onResized: () => this.updateScrollbarValues(true),
      nameId: this.nameId(),
    });
  }

  private initializeDrawSchedule(): void {
    const box = this.boxTemplate.nativeElement;
    this.drawSchedule.createCanvas();
    this.drawSchedule.width = box.clientWidth;
    this.drawSchedule.height = box.clientHeight;
    this.drawSchedule.refresh();
    this.updateScrollbarValues();
    this.resize.applyPendingResize();
  }

  private updateScrollbarValues(forceUpdate = false): void {
    if (
      !forceUpdate &&
      this.dataService.columns === this.lastColumns &&
      this.dataService.rows === this.lastRows
    ) {
      return;
    }

    if (isNaN(this.dataService.columns) || isNaN(this.dataService.rows)) {
      return;
    }

    this.lastColumns = this.dataService.columns;
    this.lastRows = this.dataService.rows;

    this.maxValueHScrollbar.emit(this.dataService.columns);
    this.visibleValueHScrollbar.emit(this.calculateVisibleColumns());
    this.valueHScrollbar.emit(this.scroll.horizontalScrollPosition);

    this.maxValueVScrollbar.emit(this.dataService.rows);
    this.visibleValueVScrollbar.emit(this.calculateVisibleRows());
    this.valueVScrollbar.emit(this.scroll.verticalScrollPosition);
  }

  private calculateVisibleColumns(): number {
    if (!this.drawSchedule.isCanvasAvailable()) return 1;
    return Math.ceil(this.drawSchedule.width / this.settings.cellWidth);
  }

  private calculateVisibleRows(): number {
    if (!this.drawSchedule.isCanvasAvailable()) return 1;
    return Math.ceil(this.drawSchedule.height / this.settings.cellHeight);
  }

  showToolTip({ value, event }: { value: string; event: MouseEvent }) {
    this.tooltipService.show({
      text: value,
      x: event.clientX,
      y: event.clientY,
    });
  }

  hideToolTip() {
    this.tooltipService.hide();
  }

  destroyToolTip() {
    this.tooltipService.hide();
  }

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      const zoomEffect = effect(() => {
        this.settings.zoomSignal();
        setTimeout(() => {
          if (this.isDestroyed) return;
          if (this.drawSchedule.isCanvasAvailable()) {
            this.drawSchedule.createCanvas();
            this.drawSchedule.rebuild();
            this.drawSchedule.redraw();
            this.updateScrollbarValues(true);
            this.cellInput.refreshForZoom();
            this.cdr.detectChanges();
          }
        }, 0);
      });
      this.effects.push(zoomEffect);

      const refreshEffect = effect(() => {
        this.dataService.refreshSignal();
        this.drawSchedule.rebuild();
        this.drawSchedule.redraw();
        this.updateScrollbarValues();
        this.cdr.detectChanges();
      });
      this.effects.push(refreshEffect);

      const holidayResetEffect = effect(() => {
        const isReset = this.dataService.holidayCollection?.isReset();
        if (isReset) {
          setTimeout(() => {
            if (this.isDestroyed) return;
            if (this.drawSchedule.isCanvasAvailable()) {
              this.drawSchedule.rebuild();
              this.drawSchedule.redraw();
            }
          }, 0);
        }
      });
      this.effects.push(holidayResetEffect);

      const cellInputEffect = effect(() => {
        const pos = this.cellManipulation.positionSignal();
        const isEditing = this.cellManipulation.isEditing();
        this.cellInput.updatePosition(pos.row, pos.column, isEditing);
      });
      this.effects.push(cellInputEffect);
    });
  }

  onNavigationKey(event: KeyboardEvent): void {
    this.passEventToCanvas(event);
  }

  onSaveInput(): void {
    const saved = this.cellInput.trySave();
    if (saved) {
      this.cellValueChange.emit(saved);
    }
  }

  onCancelInput(): void {
    this.cellInput.cancel();
  }

  onCanvasRightClick(event: GridRightClickEvent): void {
    this.rightClick.emit({
      row: event.row,
      column: event.column,
      clientX: event.clientX,
      clientY: event.clientY,
      source: 'canvas',
    });
  }

  onWorkChangeDoubleClick(event: GridDoubleClickEvent): void {
    this.workChangeDoubleClick.emit(event);
  }

  onWorkDoubleClick(event: GridDoubleClickEvent): void {
    this.workDoubleClick.emit(event);
  }

  onContainerWorkDoubleClick(event: GridDoubleClickEvent): void {
    this.containerWorkDoubleClick.emit(event);
  }

  onInputRightClick(event: CellInputRightClickEvent): void {
    this.rightClick.emit({
      row: this.cellInput.lastRow(),
      column: this.cellInput.lastColumn(),
      clientX: event.clientX,
      clientY: event.clientY,
      source: 'input',
    });
  }

  private passEventToCanvas(originalEvent: KeyboardEvent): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    canvas.focus();
    const newEvent = new KeyboardEvent('keydown', {
      key: originalEvent.key,
      code: originalEvent.code,
      shiftKey: originalEvent.shiftKey,
      ctrlKey: originalEvent.ctrlKey,
      altKey: originalEvent.altKey,
      bubbles: true,
    });
    canvas.dispatchEvent(newEvent);
  }

  onGhostCellClick(event: { row: number; column: number }): void {
    // Click on ghost cell (non-editable cell)
    this.cellManipulation.Position = new MyPosition(event.row, event.column);
  }
}

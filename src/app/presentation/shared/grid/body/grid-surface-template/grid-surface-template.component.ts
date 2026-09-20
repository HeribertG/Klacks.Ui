// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  EffectRef,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  runInInjectionContext,
  signal,
  ChangeDetectionStrategy,
  input,
  output,
  viewChild
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
import { GridScheduleEventsService } from 'src/app/presentation/workplace/schedule/services/grid-schedule-events.service';
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
import { GridFillHandleDragService } from 'src/app/presentation/workplace/schedule/services/grid-fill-handle-drag.service';
import { GridCoordinateService } from '../../services/grid-coordinate.service';
import { IScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';
import { GridCellInputController } from './grid-cell-input.controller';
import { GridResizeController } from './grid-resize.controller';
import {
  TouchGestureDirective,
  TouchPanEvent,
} from 'src/app/presentation/directives/touch-gesture.directive';
import { LongPressContextDirective } from 'src/app/presentation/directives/long-press-context.directive';
import { TouchPanAccumulator } from 'src/app/shared/helpers/touch-pan-accumulator';
import { InputModalityService } from 'src/app/presentation/services/input-modality.service';
import {
  GridCellActionsBounds,
  GridCellActionsButtonComponent,
  GridCellActionsOpenEvent,
  GridCellRect,
} from '../grid-cell-actions-button/grid-cell-actions-button.component';

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
  imports: [
    GridTemplateEventsDirective,
    CellInputEventsDirective,
    TouchGestureDirective,
    LongPressContextDirective,
    GridCellActionsButtonComponent,
  ],
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
  implements OnInit, AfterViewInit, OnDestroy
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

  readonly boxTemplate = viewChild.required<ElementRef<HTMLDivElement>>('boxTemplate');
  readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvasTemplateRef');
  readonly cellInputDirective = viewChild(CellInputEventsDirective);

  public dataService = inject(BaseDataService);
  public scroll = inject(ScrollService);
  public drawSchedule = inject(BaseDrawScheduleService);
  public settings = inject(BaseSettingsService);
  private cellManipulation = inject(BaseCellManipulationService);
  private fillHandleDrag = inject(GridFillHandleDragService);
  private gridFonts = inject(GridFontsService);
  private tooltipService = inject(TooltipService);
  public testAccessibility = inject(TestAccessibilityService);
  private gridTestAccessibility = inject(GridTestAccessibilityService);
  private coord = inject(GridCoordinateService);
  protected readonly inputModality = inject(InputModalityService);

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

  private readonly touchPanAccumulator = new TouchPanAccumulator();
  private readonly selectionVersion = signal(0);

  readonly selectedCellRect = computed<GridCellRect | null>(() => {
    this.selectionVersion();
    this.cellManipulation.positionSignal();
    return this.calculateAnchorCellRect();
  });

  readonly cellActionsBounds = computed<GridCellActionsBounds>(() => {
    this.selectionVersion();
    return { width: this.drawSchedule.width, height: this.drawSchedule.height };
  });

  notifySelectionChanged(): void {
    this.selectionVersion.update((version) => version + 1);
  }

  onCellActionsOpen(event: GridCellActionsOpenEvent): void {
    const position = this.drawSchedule.position;
    if (!position || !this.drawSchedule.isPositionValid(position)) {
      return;
    }
    this.rightClick.emit({
      row: position.row,
      column: position.column,
      clientX: event.clientX,
      clientY: event.clientY,
      source: 'canvas',
    });
  }

  private calculateAnchorCellRect(): GridCellRect | null {
    const cellWidth = this.settings.cellWidth;
    const cellHeight = this.settings.cellHeight;
    if (cellWidth <= 0 || cellHeight <= 0) {
      return null;
    }

    const bounds = this.readSelectionBounds();
    if (!bounds) {
      return null;
    }

    const headerHeight = this.settings.cellHeaderHeight;
    const firstVisibleColumn = this.scroll.horizontalScrollPosition;
    const firstVisibleRow = this.scroll.verticalScrollPosition;
    const leftOfMinColumn = this.coord.cellX(bounds.minColumn - firstVisibleColumn);
    const leftOfMaxColumn = this.coord.cellX(bounds.maxColumn - firstVisibleColumn);
    const left = Math.max(leftOfMinColumn, leftOfMaxColumn);
    const top = headerHeight + (bounds.minRow - firstVisibleRow) * cellHeight;

    if (left + cellWidth <= 0 || left >= this.drawSchedule.width) {
      return null;
    }
    if (top + cellHeight <= headerHeight || top >= this.drawSchedule.height) {
      return null;
    }

    return { left, top, width: cellWidth, height: cellHeight };
  }

  private readSelectionBounds(): { minRow: number; minColumn: number; maxColumn: number } | null {
    const collection = this.cellManipulation.PositionCollection;
    if (collection.count() > 0) {
      return {
        minRow: collection.minRow(),
        minColumn: collection.minColumn(),
        maxColumn: collection.maxColumn(),
      };
    }

    const position = this.drawSchedule.position;
    if (!position || !this.drawSchedule.isPositionValid(position)) {
      return null;
    }
    return { minRow: position.row, minColumn: position.column, maxColumn: position.column };
  }

  readonly isPointerOnSelection = (event: PointerEvent): boolean => {
    if (this.cellInput.visible()) {
      return false;
    }
    const pos = this.drawSchedule.calcCorrectCoordinate(event);
    if (!this.drawSchedule.isPositionValid(pos)) {
      return false;
    }
    if (this.fillHandleDrag.isPointerOverFillHandle(event)) {
      return true;
    }
    return this.cellManipulation.isPositionInSelection(pos);
  };

  onTouchPan(event: TouchPanEvent): void {
    const { columns, rows } = this.touchPanAccumulator.consume(
      event.dx,
      event.dy,
      this.settings.cellWidth,
      this.settings.cellHeight,
    );
    if (columns !== 0) {
      this.valueHScrollbar.emit(Math.max(0, this.scroll.horizontalScrollPosition + columns));
    }
    if (rows !== 0) {
      this.valueVScrollbar.emit(Math.max(0, this.scroll.verticalScrollPosition + rows));
    }
  }

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
    this.cellInput.setDirective(this.cellInputDirective());
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
      onResized: () => {
        this.updateScrollbarValues(true);
        this.notifySelectionChanged();
      },
      nameId: this.nameId(),
    });
  }

  private initializeDrawSchedule(): void {
    const box = this.boxTemplate().nativeElement;
    this.drawSchedule.createCanvas();
    this.drawSchedule.width = box.clientWidth;
    this.drawSchedule.height = box.clientHeight;
    this.drawSchedule.refresh();
    this.updateScrollbarValues();
    this.resize.applyPendingResize();
    this.notifySelectionChanged();
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
            this.notifySelectionChanged();
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

      let lastH: number | undefined;
      let lastV: number | undefined;
      const scrollEffect = effect(() => {
        const currH = this.valueChangeHScrollbar();
        const currV = this.valueChangeVScrollbar();
        const hChanged = currH !== lastH;
        const vChanged = currV !== lastV;
        lastH = currH;
        lastV = currV;

        if (hChanged) {
          if (currH > this.scroll.maxCols) {
            this.scroll.maxCols = currH + 10;
          }
          this.scroll.horizontalScrollPosition = currH;
          this.scroll.updateScrollPosition(
            currH,
            this.scroll.verticalScrollPosition,
          );
        }

        if (vChanged) {
          this.scroll.verticalScrollPosition = currV;
          this.scroll.updateScrollPosition(
            this.scroll.horizontalScrollPosition,
            currV,
          );
        }

        if (hChanged || vChanged) {
          this.drawSchedule.moveGrid();
          this.cellInput.refreshForScroll();
          this.notifySelectionChanged();
        }
      });
      this.effects.push(scrollEffect);
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
    const canvas = this.canvasRef()?.nativeElement;
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

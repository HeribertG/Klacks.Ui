// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  EffectRef,
  ElementRef,
  EventEmitter,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  effect,
  inject,
  runInInjectionContext,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GridSurfaceTemplateComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @Input() contextMenu?: ContextMenuComponent;
  @Input() valueChangeHScrollbar!: number;
  @Input() valueChangeVScrollbar!: number;
  @Input() nameId!: string;

  @Output() valueHScrollbar = new EventEmitter<number>();
  @Output() maxValueHScrollbar = new EventEmitter<number>();
  @Output() visibleValueHScrollbar = new EventEmitter<number>();
  @Output() valueVScrollbar = new EventEmitter<number>();
  @Output() maxValueVScrollbar = new EventEmitter<number>();
  @Output() visibleValueVScrollbar = new EventEmitter<number>();
  @Output() cellValueChange = new EventEmitter<CellValueChangeEvent>();
  @Output() rightClick = new EventEmitter<GridSurfaceRightClickEvent>();
  @Output() workChangeDoubleClick = new EventEmitter<GridDoubleClickEvent>();
  @Output() workDoubleClick = new EventEmitter<GridDoubleClickEvent>();
  @Output() containerWorkDoubleClick = new EventEmitter<GridDoubleClickEvent>();

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

  public cellInputVisible = false;
  public cellInputX = 0;
  public cellInputY = 0;
  public cellInputWidth = 0;
  public lastEditedRow = -1;
  public lastEditedColumn = -1;

  public get cellInputFontSize(): string {
    return this.gridFonts.mainFontSizeZoom + 'pt';
  }

  public get cellInputFontFamily(): string {
    return this.gridFonts.mainFontName;
  }
  private _pixelRatio = 1;
  private ngUnsubscribe = new Subject<void>();
  private effects: EffectRef[] = [];

  private resizeObserver?: ResizeObserver;
  private lastWidth = 0;
  private lastHeight = 0;
  private readonly RESIZE_THRESHOLD = 2;
  private pendingResize?: { width: number; height: number };
  private isDestroyed = false;

  private lastColumns = 0;
  private lastRows = 0;

  ngOnInit(): void {
    this.readSignals();
    this._pixelRatio = DrawHelper.pixelRatio();
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

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = undefined;
    }
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
      this.updateCellInputOnScroll();
    }
  }

  private updateCellInputOnScroll(): void {
    if (!this.cellInputVisible) return;
    const pos = this.cellManipulation.positionSignal();
    const isEditing = this.cellManipulation.isEditing();
    this.updateCellInputPosition(pos.row, pos.column, isEditing);
  }

  private updateCellInputOnZoom(): void {
    if (!this.cellInputVisible) return;
    const pos = this.cellManipulation.positionSignal();
    const isEditing = this.cellManipulation.isEditing();
    this.updateCellInputPosition(pos.row, pos.column, isEditing);
    this.cdr.detectChanges();
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
    const parentElement = this.el.nativeElement.parentElement;
    if (
      parentElement &&
      typeof window !== 'undefined' &&
      'ResizeObserver' in window
    ) {
      this.resizeObserver = new ResizeObserver((entries) => {
        this.handleParentResize(entries);
      });

      this.resizeObserver.observe(parentElement);
    } else {
      console.warn(
        '[TEMPLATE] ResizeObserver not available or no parent element:',
        this.nameId,
      );
    }
  }

  private handleParentResize(entries: ResizeObserverEntry[]): void {
    if (entries?.length > 0) {
      const entry = entries[0];
      const newWidth = Math.round(entry.contentRect.width);
      const newHeight = Math.round(entry.contentRect.height);

      if (newWidth <= 0 || newHeight <= 0) {
        return;
      }

      if (!this.drawSchedule.isCanvasAvailable()) {
        this.pendingResize = { width: newWidth, height: newHeight };
        return;
      }

      if (
        Math.abs(newWidth - this.lastWidth) >= this.RESIZE_THRESHOLD ||
        Math.abs(newHeight - this.lastHeight) >= this.RESIZE_THRESHOLD
      ) {
        this.lastWidth = newWidth;
        this.lastHeight = newHeight;

        this.updateDrawScheduleDimensions({
          width: newWidth,
          height: newHeight,
        } as DOMRectReadOnly);

        this.checkPixelRatio();
        this.updateScrollbarValues(true);
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
    this.applyPendingResize();
  }

  private applyPendingResize(): void {
    if (this.pendingResize && this.drawSchedule.isCanvasAvailable()) {
      const { width, height } = this.pendingResize;
      this.pendingResize = undefined;

      if (
        Math.abs(width - this.lastWidth) >= this.RESIZE_THRESHOLD ||
        Math.abs(height - this.lastHeight) >= this.RESIZE_THRESHOLD
      ) {
        this.lastWidth = width;
        this.lastHeight = height;

        this.updateDrawScheduleDimensions({
          width,
          height,
        } as DOMRectReadOnly);

        this.checkPixelRatio();
        this.updateScrollbarValues(true);
      }
    }
  }

  private updateDrawScheduleDimensions(rec: DOMRectReadOnly): void {
    this.drawSchedule.width = rec.width;
    this.drawSchedule.height = rec.height;
    this.drawSchedule.refresh();
  }

  private checkPixelRatio(): void {
    const pixelRatio = DrawHelper.pixelRatio();

    if (this._pixelRatio !== pixelRatio) {
      this._pixelRatio = pixelRatio;
      this.drawSchedule.createCanvas();
      this.drawSchedule.rebuild();
      this.drawSchedule.redraw();
    }
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
            this.updateCellInputOnZoom();
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
        this.updateCellInputPosition(pos.row, pos.column, isEditing);
      });
      this.effects.push(cellInputEffect);
    });
  }

  onNavigationKey(event: KeyboardEvent): void {
    this.passEventToCanvas(event);
  }

  onSaveInput(): void {
    this.saveCellInput();
  }

  onCancelInput(): void {
    this.cancelCellInput();
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
      row: this.lastEditedRow,
      column: this.lastEditedColumn,
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

  private updateCellInputPosition(
    row: number,
    column: number,
    isEditing: boolean,
  ): void {
    if (!this.settings.editable || row < 0 || column < 0) {
      this.hideCellInput();
      return;
    }

    if (!isEditing) {
      this.hideCellInput();
      return;
    }

    if (!this.dataService.isCellEditable(row, column)) {
      this.hideCellInput();
      return;
    }

    const firstVisibleRow = this.scroll.verticalScrollPosition;
    const firstVisibleCol = this.scroll.horizontalScrollPosition;
    const visibleRows = this.calculateVisibleRows();
    const visibleCols = this.calculateVisibleColumns();

    const isVisible =
      row >= firstVisibleRow &&
      row < firstVisibleRow + visibleRows &&
      column >= firstVisibleCol &&
      column < firstVisibleCol + visibleCols;

    if (!isVisible) {
      this.hideCellInput();
      return;
    }

    const visibleCol = column - firstVisibleCol;
    const x = this.coord.cellX(visibleCol);
    const y =
      (row - firstVisibleRow) * this.settings.cellHeight +
      this.settings.cellHeaderHeight;

    this.showCellInput(x, y, row, column);
  }

  private showCellInput(
    x: number,
    y: number,
    row: number,
    column: number,
  ): void {
    const isNewCell =
      row !== this.lastEditedRow || column !== this.lastEditedColumn;

    const gridCell = this.dataService.getCell(row, column);
    const editSpan = gridCell?.colSpan || 1;
    const firstVisibleCol = this.scroll.horizontalScrollPosition;
    const visibleCols = this.calculateVisibleColumns();
    const maxSpan = Math.max(1, visibleCols - (column - firstVisibleCol));
    const clampedSpan = Math.min(editSpan, maxSpan);
    const visibleCol = column - firstVisibleCol;

    this.cellInputX = this.coord.cellXWithSpan(visibleCol, clampedSpan);
    this.cellInputY = y;
    this.cellInputWidth = clampedSpan * this.settings.cellWidth;
    this.cellInputVisible = true;
    this.lastEditedRow = row;
    this.lastEditedColumn = column;

    if (isNewCell && this.cellInputDirective) {
      const initialChar = this.cellManipulation.initialEditChar();
      if (initialChar) {
        this.cellInputDirective.value = initialChar;
      } else {
        const content = this.dataService.getItemMainText(row, column);
        this.cellInputDirective.value = content;
      }
      setTimeout(() => {
        this.cellInputDirective?.focus();
        if (!initialChar) {
          this.cellInputDirective?.select();
        } else {
          this.cellInputDirective?.moveCursorToEnd();
        }
      }, 0);
    }
  }

  private hideCellInput(): void {
    this.cellInputVisible = false;
    this.lastEditedRow = -1;
    this.lastEditedColumn = -1;
  }

  private saveCellInput(): void {
    if (
      !this.cellInputVisible ||
      this.lastEditedRow < 0 ||
      this.lastEditedColumn < 0
    ) {
      return;
    }

    const value = this.cellInputDirective?.value ?? '';
    this.cellValueChange.emit({
      row: this.lastEditedRow,
      column: this.lastEditedColumn,
      value,
    });
  }

  private cancelCellInput(): void {
    if (
      this.lastEditedRow >= 0 &&
      this.lastEditedColumn >= 0 &&
      this.cellInputDirective
    ) {
      const content = this.dataService.getItemMainText(
        this.lastEditedRow,
        this.lastEditedColumn,
      );
      this.cellInputDirective.value = content;
    }
    this.cellInputDirective?.blur();
  }

  onGhostCellClick(event: { row: number; column: number }): void {
    // Click on ghost cell (non-editable cell)
    this.cellManipulation.Position = new MyPosition(event.row, event.column);
  }
}

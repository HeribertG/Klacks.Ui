// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Canvas-based time axis for displaying and interacting with shift boxes.
 * @param fromTime - Start time of the displayed time range
 * @param untilTime - End time of the displayed time range
 * @param shiftRightClick - Event on right-click on a shift box
 */

import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  inject,
  effect,
  Injector,
  ChangeDetectionStrategy,
  input,
  output
} from '@angular/core';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { DrawHelper } from '../../helpers/draw-helper';
import { DrawImageHelper } from '../../helpers/draw-image-helper';
import { TimeRangeService } from './services/time-range.service';
import { TimeRulerDragDropService } from './services/time-ruler-drag-drop.service';
import { IShiftSceneContext, TimeRulerRenderService } from './services/time-ruler-render.service';
import { TimeRulerInteractionService } from './services/time-ruler-interaction.service';
import { TimeRulerBlockSelectionService } from './services/time-ruler-block-selection.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';

export interface IShiftContextMenuEvent {
  item: IContainerTemplateItem;
  mouseEvent: MouseEvent;
}

@Component({
  selector: 'app-time-ruler',
  imports: [],
  templateUrl: './time-ruler.component.html',
  styleUrl: './time-ruler.component.scss',
  providers: [TimeRulerDragDropService, TimeRulerInteractionService, TimeRulerBlockSelectionService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeRulerComponent implements AfterViewInit, OnDestroy, OnChanges {
  readonly fromTime = input<OwnTime>(OwnTime.forTime('00', '00'));
  readonly untilTime = input<OwnTime>(OwnTime.forTime('24', '00'));
  readonly shiftRightClick = output<IShiftContextMenuEvent>();
  readonly itemsDisplaced = output<void>();

  private shifts: IContainerTemplateItem[] = [];
  private shiftRectangles = new Map<IContainerTemplateItem, Rectangle>();

  private _lastFromTimeString = '';
  private _lastUntilTimeString = '';

  @ViewChild('inboxCanvas', { static: false })
  inboxCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('rulerCanvas', { static: false })
  rulerCanvasRef!: ElementRef<HTMLCanvasElement>;

  private timeRangeService = inject(TimeRangeService);
  private dragDropService = inject(TimeRulerDragDropService);
  private gridColorService = inject(GridColorService);
  private shiftService = inject(ContainerTemplateShiftService);
  private renderService = inject(TimeRulerRenderService);
  private interactionService = inject(TimeRulerInteractionService);
  private blockSelectionService = inject(TimeRulerBlockSelectionService);
  private injector = inject(Injector);
  private resizeObserver?: ResizeObserver;

  private renderCanvas: HTMLCanvasElement | undefined;
  private renderCtx: CanvasRenderingContext2D | undefined;

  constructor() {
    effect(
      () => {
        const newShifts =
          this.shiftService.selectedContainerTemplateItemsSignal();
        this.shifts = newShifts;

        if (this.inboxCanvasRef) {
          this.setupCanvas();
        }
      },
      { injector: this.injector, allowSignalWrites: true }
    );

    effect(
      () => {
        const selectedItems = this.blockSelectionService.selectedItems();
        void selectedItems.size;
        void this.shiftService.selectedShiftSignal();

        if (this.inboxCanvasRef) {
          this.redrawWithSelection();
        }
      },
      { injector: this.injector, allowSignalWrites: true }
    );
  }

  ngAfterViewInit(): void {
    this.setupCanvas();
    this.setupResizeObserver();
    document.addEventListener('keydown', this.onKeyDown);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['fromTime'] || changes['untilTime']) && this.inboxCanvasRef) {
      const fromTimeString = `${this.fromTime().hours}:${this.fromTime().minutes}`;
      const untilTimeString = `${this.untilTime().hours}:${this.untilTime().minutes}`;

      if (
        fromTimeString !== this._lastFromTimeString ||
        untilTimeString !== this._lastUntilTimeString
      ) {
        this._lastFromTimeString = fromTimeString;
        this._lastUntilTimeString = untilTimeString;
        this.setupCanvas();
      }
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    document.removeEventListener('keydown', this.onKeyDown);
  }

  private setupCanvas(): void {
    const inboxCanvas = this.inboxCanvasRef.nativeElement;
    const rulerCanvas = this.rulerCanvasRef.nativeElement;

    const container = inboxCanvas.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const inboxCtx = DrawHelper.createHiDPICanvas(inboxCanvas, width, height);

    const rulerWidth = this.renderService.RULER_WIDTH;
    const boundaryWidth = width - rulerWidth;
    const rulerCtx = DrawHelper.createHiDPICanvas(
      rulerCanvas,
      rulerWidth,
      height
    );

    if (!this.renderCanvas) {
      this.renderCanvas = document.createElement('canvas');
    }
    this.renderCtx = DrawHelper.createHiDPICanvas(
      this.renderCanvas,
      boundaryWidth,
      height
    );
    DrawHelper.setAntiAliasing(this.renderCtx);

    const paddingMinutes = this.renderService.calculatePaddingMinutes(
      this.fromTime(),
      this.untilTime()
    );
    const range = this.timeRangeService.calculateDisplayRange(
      this.fromTime(),
      this.untilTime(),
      paddingMinutes
    );
    const pixelsPerMinute = height / range.totalMinutes;

    this.dragDropService.initializeDragState(
      pixelsPerMinute,
      1,
      range.displayFromMinutes,
      range.totalMinutes
    );

    const contentOffsetX = this.renderService.contentOffsetX;
    const rulerOffsetX = document.documentElement.dir === 'rtl' ? 0 : boundaryWidth;

    inboxCtx.fillStyle = this.gridColorService.backGroundColor;
    inboxCtx.fillRect(contentOffsetX, 0, boundaryWidth, height);

    rulerCtx.fillStyle = this.gridColorService.toolTipBackGroundColor;
    rulerCtx.fillRect(0, 0, rulerWidth, height);

    const fromTime = this.fromTime();
    const untilTime = this.untilTime();
    this.renderService.drawTimeRuler(rulerCtx, height, fromTime, untilTime);

    inboxCtx.save();
    inboxCtx.translate(contentOffsetX, 0);
    this.renderService.drawRedBoundaryLines(
      inboxCtx, boundaryWidth, height, fromTime, untilTime
    );
    inboxCtx.restore();

    this.renderService.renderShiftsToCache(
      this.renderCtx, boundaryWidth, height, this.buildScene(),
    );
    this.renderService.drawFromCache(inboxCtx, this.renderCanvas, inboxCanvas);

    if (this.blockSelectionService.hasBlock()) {
      const {
        range: shiftRange,
        boxWidth,
        marginLeftRight,
      } = this.renderService.calculateShiftBoxParameters(
        boundaryWidth, height, fromTime, untilTime
      );

      inboxCtx.save();
      inboxCtx.translate(contentOffsetX, 0);

      for (const selectedItem of this.blockSelectionService.selectedItems()) {
        const selectedRect = this.renderService.drawSingleShiftBox(
          inboxCtx,
          selectedItem,
          shiftRange,
          boxWidth,
          marginLeftRight,
          height,
          true,
          this.shifts,
          this.shiftRectangles
        );
        if (selectedRect) {
          this.shiftRectangles.set(selectedItem, selectedRect);
        }
      }

      this.renderService.drawBlockSelectionRect(
        inboxCtx,
        this.blockSelectionService.calculateBlockBounds(marginLeftRight, boxWidth, shiftRange, height)
      );

      inboxCtx.restore();
    }

    DrawImageHelper.drawCanvasLogical(
      inboxCtx,
      rulerCanvas,
      rulerOffsetX,
      0,
      rulerWidth,
      height
    );
  }

  private redrawWithSelection(): void {
    if (!this.renderCanvas) return;
    const selectedItem = this.blockSelectionService.getSelectedSingle()
      ?? this.shiftService.selectedShiftSignal();
    this.renderService.redrawWithSelection(
      this.inboxCanvasRef.nativeElement,
      this.renderCanvas,
      selectedItem,
      this.buildScene(),
      this.blockSelectionService,
    );
  }

  private buildScene(): IShiftSceneContext {
    return {
      shifts: this.shifts,
      shiftRectangles: this.shiftRectangles,
      fromTime: this.fromTime(),
      untilTime: this.untilTime(),
    };
  }

  private setupResizeObserver(): void {
    const inboxCanvas = this.inboxCanvasRef.nativeElement;
    const container = inboxCanvas.parentElement;
    if (!container) return;

    this.resizeObserver = new ResizeObserver(() => {
      this.setupCanvas();
    });

    this.resizeObserver.observe(container);
  }

  onCanvasClick(event: MouseEvent): void {
    this.interactionService.handleCanvasClick(
      event,
      this.inboxCanvasRef.nativeElement,
      this.shiftRectangles,
      this.blockSelectionService,
      this.shifts
    );
  }

  onContextMenu(event: MouseEvent): void {
    this.interactionService.handleContextMenu(
      event,
      this.inboxCanvasRef.nativeElement,
      this.shiftRectangles,
      this.shiftRightClick
    );
  }

  onMouseDown(event: MouseEvent): void {
    this.interactionService.handleMouseDown(
      event,
      this.inboxCanvasRef.nativeElement,
      this.shiftRectangles,
      this.shifts,
      this.blockSelectionService
    );
  }

  onMouseMove(event: MouseEvent): void {
    if (this.interactionService.isPaintSelecting) {
      this.interactionService.handlePaintSelectMove(
        event,
        this.inboxCanvasRef.nativeElement,
        this.shiftRectangles,
        this.blockSelectionService
      );
      return;
    }

    const result = this.interactionService.handleMouseMove(
      event,
      this.inboxCanvasRef.nativeElement,
      this.shifts
    );

    if (!result) return;

    const dragState = this.dragDropService.dragState;
    const draggedShift = dragState.draggedShift;
    if (!draggedShift) return;

    const isBlockDrag = dragState.isBlockDrag;
    const blockItems = isBlockDrag ? this.blockSelectionService.selectedItems() : new Set([draggedShift]);

    for (const item of blockItems) {
      const displaced = result.displacements.get(item);
      if (displaced) {
        this.applyPositionToItem(item, displaced.startMinutes, displaced.endMinutes);
      } else if (item === draggedShift) {
        this.applyPositionToItem(
          item,
          result.draggedPosition.newStartMinutes,
          result.draggedPosition.newEndMinutes
        );
      }
    }

    for (const item of this.shifts) {
      if (blockItems.has(item)) continue;

      const displaced = result.displacements.get(item);
      if (displaced) {
        this.applyPositionToItem(item, displaced.startMinutes, displaced.endMinutes);
      } else {
        const orig = dragState.originalPositions.get(item);
        if (orig) {
          this.applyPositionToItem(item, orig.startMinutes, orig.endMinutes);
        }
      }
    }

    this.itemsDisplaced.emit();

    if (this.renderCanvas && this.renderCtx) {
      this.renderService.redrawCanvas(
        this.inboxCanvasRef.nativeElement,
        this.renderCanvas,
        this.renderCtx,
        draggedShift,
        this.buildScene(),
      );
    }
  }

  private applyPositionToItem(
    item: IContainerTemplateItem,
    startMinutes: number,
    endMinutes: number
  ): void {
    const formattedStart = this.dragDropService.formatTimeFromMinutes(startMinutes);
    const formattedEnd = this.dragDropService.formatTimeFromMinutes(endMinutes);

    if (item.absenceId) {
      item.startItem = formattedStart;
      item.endItem = formattedEnd;
    } else {
      item.timeRangeStartItem = formattedStart;
      item.timeRangeEndItem = formattedEnd;
    }
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.blockSelectionService.clearSelection();
    }
  };

  onMouseUp(event: MouseEvent): void {
    if (this.interactionService.isPaintSelecting) {
      this.interactionService.endPaintSelect();
      return;
    }

    const dragHandled = this.interactionService.handleMouseUp(event, this.shifts);

    if (dragHandled) {
      const canvas = this.inboxCanvasRef.nativeElement;
      const container = canvas.parentElement;
      if (!container) return;

      const width = container.clientWidth;
      const height = container.clientHeight;
      const rulerWidth = this.renderService.RULER_WIDTH;
      const boundaryWidth = width - rulerWidth;

      if (this.renderCtx) {
        this.renderService.renderShiftsToCache(
          this.renderCtx, boundaryWidth, height, this.buildScene(),
        );
      }

      this.redrawWithSelection();
    }
  }
}

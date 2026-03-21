// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Canvas-basierte Zeitachse zur Darstellung und Interaktion mit Schicht-Boxen.
 * @param fromTime - Startzeit des angezeigten Zeitbereichs
 * @param untilTime - Endzeit des angezeigten Zeitbereichs
 * @param shiftRightClick - Event bei Rechtsklick auf eine Schicht-Box
 */

import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  Input,
  Output,
  EventEmitter,
  inject,
  effect,
  Injector,
  ChangeDetectionStrategy,
} from '@angular/core';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { DrawHelper } from '../../helpers/draw-helper';
import { DrawImageHelper } from '../../helpers/draw-image-helper';
import { TimeRangeService } from './services/time-range.service';
import { TimeRulerDragDropService } from './services/time-ruler-drag-drop.service';
import { TimeRulerRenderService } from './services/time-ruler-render.service';
import { TimeRulerInteractionService } from './services/time-ruler-interaction.service';
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
  providers: [TimeRulerDragDropService, TimeRulerInteractionService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeRulerComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() fromTime: OwnTime = OwnTime.forTime('00', '00');
  @Input() untilTime: OwnTime = OwnTime.forTime('24', '00');
  @Output() shiftRightClick = new EventEmitter<IShiftContextMenuEvent>();

  private shifts: IContainerTemplateItem[] = [];
  private selectedShift: IContainerTemplateItem | null = null;
  private shiftRectangles: Map<IContainerTemplateItem, Rectangle> = new Map();

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
        const newSelectedShift = this.shiftService.selectedShiftSignal();
        const selectionChanged = this.selectedShift !== newSelectedShift;
        this.selectedShift = newSelectedShift;

        if (this.inboxCanvasRef && selectionChanged) {
          this.redrawWithSelection();
        }
      },
      { injector: this.injector, allowSignalWrites: true }
    );
  }

  ngAfterViewInit(): void {
    this.setupCanvas();
    this.setupResizeObserver();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['fromTime'] || changes['untilTime']) && this.inboxCanvasRef) {
      const fromTimeString = `${this.fromTime.hours}:${this.fromTime.minutes}`;
      const untilTimeString = `${this.untilTime.hours}:${this.untilTime.minutes}`;

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
      this.fromTime,
      this.untilTime
    );
    const range = this.timeRangeService.calculateDisplayRange(
      this.fromTime,
      this.untilTime,
      paddingMinutes
    );
    const pixelsPerMinute = height / range.totalMinutes;

    this.dragDropService.initializeDragState(
      pixelsPerMinute,
      1,
      range.displayFromMinutes,
      range.totalMinutes
    );

    inboxCtx.fillStyle = this.gridColorService.backGroundColor;
    inboxCtx.fillRect(0, 0, boundaryWidth, height);

    rulerCtx.fillStyle = this.gridColorService.toolTipBackGroundColor;
    rulerCtx.fillRect(0, 0, rulerWidth, height);

    this.renderService.drawTimeRuler(rulerCtx, height, this.fromTime, this.untilTime);
    this.renderService.drawRedBoundaryLines(
      inboxCtx, boundaryWidth, height, this.fromTime, this.untilTime
    );
    this.renderService.renderShiftsToCache(
      this.renderCtx, boundaryWidth, height, this.shifts,
      this.shiftRectangles, this.fromTime, this.untilTime
    );
    this.renderService.drawFromCache(inboxCtx, this.renderCanvas, inboxCanvas);

    if (this.selectedShift) {
      const {
        range: shiftRange,
        boxWidth,
        marginLeftRight,
      } = this.renderService.calculateShiftBoxParameters(
        boundaryWidth, height, this.fromTime, this.untilTime
      );

      const selectedRect = this.renderService.drawSingleShiftBox(
        inboxCtx,
        this.selectedShift,
        shiftRange,
        boxWidth,
        marginLeftRight,
        height,
        true,
        this.shifts,
        this.shiftRectangles
      );

      if (selectedRect) {
        this.shiftRectangles.set(this.selectedShift, selectedRect);
      }
    }

    DrawImageHelper.drawCanvasLogical(
      inboxCtx,
      rulerCanvas,
      boundaryWidth,
      0,
      rulerWidth,
      height
    );
  }

  private redrawWithSelection(): void {
    if (!this.renderCanvas) return;
    this.renderService.redrawWithSelection(
      this.inboxCanvasRef.nativeElement,
      this.renderCanvas,
      this.selectedShift,
      this.shifts,
      this.shiftRectangles,
      this.fromTime,
      this.untilTime
    );
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
      this.shiftRectangles
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
      this.shiftRectangles
    );
  }

  onMouseMove(event: MouseEvent): void {
    const newPosition = this.interactionService.handleMouseMove(
      event,
      this.inboxCanvasRef.nativeElement,
      this.shifts
    );

    if (!newPosition) return;

    const draggedShift = this.dragDropService.dragState.draggedShift;
    if (draggedShift) {
      draggedShift.timeRangeStartItem =
        this.dragDropService.formatTimeFromMinutes(newPosition.newStartMinutes);
      draggedShift.timeRangeEndItem =
        this.dragDropService.formatTimeFromMinutes(newPosition.newEndMinutes);

      if (this.renderCanvas && this.renderCtx) {
        this.renderService.redrawCanvas(
          this.inboxCanvasRef.nativeElement,
          this.renderCanvas,
          this.renderCtx,
          draggedShift,
          this.shifts,
          this.shiftRectangles,
          this.fromTime,
          this.untilTime
        );
      }
    }
  }

  onMouseUp(event: MouseEvent): void {
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
          this.renderCtx, boundaryWidth, height, this.shifts,
          this.shiftRectangles, this.fromTime, this.untilTime
        );
      }

      this.redrawWithSelection();
    }
  }
}

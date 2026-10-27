// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Service for composing the time ruler canvas: shift cache, selection and block highlights and the drag redraw.
 * @param gridColorService - Background and focus colors
 * @param boundaryRenderService - Time window boundary lines and color conversion
 * @param shiftBoxRenderService - Layout parameters and drawing of single shift boxes
 */

import { inject, Injectable } from '@angular/core';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-item.interface';
import { Rectangle } from 'src/app/domain/models/geometry/rectangle.model';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { DrawHelper } from '../../../helpers/draw-helper';
import { DrawImageHelper } from '../../../helpers/draw-image-helper';
import { TimeRulerBlockSelectionService } from './time-ruler-block-selection.service';
import { IShiftSceneContext } from './shift-scene-context.interface';
import { TimeRulerBoundaryRenderService } from './time-ruler-boundary-render.service';
import { TimeRulerShiftBoxRenderService } from './time-ruler-shift-box-render.service';
import { TIME_RULER_WIDTH } from './time-ruler.constants';

@Injectable({
  providedIn: 'root',
})
export class TimeRulerRenderService {
  private gridColorService = inject(GridColorService);
  private boundaryRenderService = inject(TimeRulerBoundaryRenderService);
  private shiftBoxRenderService = inject(TimeRulerShiftBoxRenderService);

  private readonly BLOCK_SELECTION_BORDER_WIDTH = 2;
  private readonly BLOCK_SELECTION_FILL_OPACITY = 0.15;

  private drawSelectedShiftHighlight(
    ctx: CanvasRenderingContext2D,
    rect: Rectangle,
  ): void {
    const DARKEN_OPACITY = 0.12;
    const DASH_PATTERN = [4, 3];
    const BORDER_WIDTH = 1.5;

    ctx.fillStyle = `rgba(30, 144, 255, ${DARKEN_OPACITY})`;
    ctx.fillRect(rect.left, rect.top, rect.width, rect.height);

    ctx.save();
    ctx.setLineDash(DASH_PATTERN);
    ctx.strokeStyle = this.gridColorService.focusBorderColor;
    ctx.lineWidth = BORDER_WIDTH;
    ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);
    ctx.restore();
  }

  drawBlockSelectionRect(
    ctx: CanvasRenderingContext2D,
    blockBounds: Rectangle | null
  ): void {
    if (!blockBounds) return;

    const fillColor = this.boundaryRenderService.convertColorToRgba(
      this.gridColorService.focusBorderColor,
      this.BLOCK_SELECTION_FILL_OPACITY
    );

    ctx.fillStyle = fillColor;
    ctx.fillRect(blockBounds.left, blockBounds.top, blockBounds.width, blockBounds.height);

    ctx.strokeStyle = this.gridColorService.focusBorderColor;
    ctx.lineWidth = this.BLOCK_SELECTION_BORDER_WIDTH;
    ctx.strokeRect(blockBounds.left, blockBounds.top, blockBounds.width, blockBounds.height);
  }

  renderShiftsToCache(
    renderCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scene: IShiftSceneContext,
  ): void {
    if (!scene.shifts || scene.shifts.length === 0) return;

    scene.shiftRectangles.clear();

    renderCtx.fillStyle = this.gridColorService.backGroundColor;
    renderCtx.fillRect(0, 0, width, height);

    this.boundaryRenderService.drawRedBoundaryLines(renderCtx, width, height, scene.fromTime, scene.untilTime);

    const { range, boxWidth, marginLeftRight } =
      this.shiftBoxRenderService.calculateShiftBoxParameters(width, height, scene.fromTime, scene.untilTime);

    scene.shifts.forEach((shift) => {
      this.shiftBoxRenderService.drawSingleShiftBox(
        renderCtx,
        shift,
        range,
        boxWidth,
        marginLeftRight,
        height,
        false,
        scene.shifts,
        scene.shiftRectangles,
      );
    });
  }

  get contentOffsetX(): number {
    return document.documentElement.dir === 'rtl' ? TIME_RULER_WIDTH : 0;
  }

  drawFromCache(
    ctx: CanvasRenderingContext2D,
    renderCanvas: HTMLCanvasElement,
    inboxCanvas: HTMLCanvasElement
  ): void {
    const container = inboxCanvas.parentElement;
    if (!container) return;

    const rulerWidth = TIME_RULER_WIDTH;
    const boundaryWidth = container.clientWidth - rulerWidth;
    const height = container.clientHeight;

    DrawImageHelper.drawCanvasLogical(
      ctx,
      renderCanvas,
      this.contentOffsetX,
      0,
      boundaryWidth,
      height
    );
  }

  redrawWithSelection(
    inboxCanvas: HTMLCanvasElement,
    renderCanvas: HTMLCanvasElement,
    selectedShift: IContainerTemplateItem | null,
    scene: IShiftSceneContext,
    blockSelectionService?: TimeRulerBlockSelectionService,
  ): void {
    const container = inboxCanvas.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const inboxCtx = inboxCanvas.getContext('2d');
    if (!inboxCtx) return;

    const rulerWidth = TIME_RULER_WIDTH;
    const boundaryWidth = width - rulerWidth;

    const offsetX = this.contentOffsetX;
    inboxCtx.clearRect(offsetX, 0, boundaryWidth, height);
    this.drawFromCache(inboxCtx, renderCanvas, inboxCanvas);

    if (selectedShift) {
      const { range, boxWidth, marginLeftRight } =
        this.shiftBoxRenderService.calculateShiftBoxParameters(boundaryWidth, height, scene.fromTime, scene.untilTime);

      inboxCtx.save();
      inboxCtx.translate(offsetX, 0);
      const selectedRect = this.shiftBoxRenderService.drawSingleShiftBox(
        inboxCtx,
        selectedShift,
        range,
        boxWidth,
        marginLeftRight,
        height,
        true,
        scene.shifts,
        scene.shiftRectangles,
      );
      inboxCtx.restore();

      if (selectedRect) {
        scene.shiftRectangles.set(selectedShift, selectedRect);
        if (!blockSelectionService?.hasBlock()) {
          this.drawSelectedShiftHighlight(inboxCtx, selectedRect);
        }
      }
    }

    if (blockSelectionService && blockSelectionService.hasBlock()) {
      const { range: blockRange, boxWidth: blockBoxWidth, marginLeftRight: blockMargin } =
        this.shiftBoxRenderService.calculateShiftBoxParameters(boundaryWidth, height, scene.fromTime, scene.untilTime);

      inboxCtx.save();
      inboxCtx.translate(offsetX, 0);

      for (const item of blockSelectionService.selectedItems()) {
        if (item === selectedShift) continue;
        const itemRect = this.shiftBoxRenderService.drawSingleShiftBox(
          inboxCtx, item, blockRange, blockBoxWidth, blockMargin,
          height, true, scene.shifts, scene.shiftRectangles,
        );
        if (itemRect) {
          scene.shiftRectangles.set(item, itemRect);
        }
      }

      this.drawBlockSelectionRect(
        inboxCtx,
        blockSelectionService.calculateBlockBounds(blockMargin, blockBoxWidth, blockRange, height),
      );
      inboxCtx.restore();
    }
  }

  redrawCanvas(
    inboxCanvas: HTMLCanvasElement,
    renderCanvas: HTMLCanvasElement,
    renderCtx: CanvasRenderingContext2D,
    draggedShift: IContainerTemplateItem,
    scene: IShiftSceneContext,
  ): void {
    const container = inboxCanvas.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const inboxCtx = inboxCanvas.getContext('2d');
    if (!inboxCtx) return;

    const rulerWidth = TIME_RULER_WIDTH;
    const boundaryWidth = width - rulerWidth;

    const offsetX = this.contentOffsetX;
    inboxCtx.clearRect(offsetX, 0, boundaryWidth, height);

    this.drawFromCache(inboxCtx, renderCanvas, inboxCanvas);

    const { range, boxWidth, marginLeftRight } =
      this.shiftBoxRenderService.calculateShiftBoxParameters(boundaryWidth, height, scene.fromTime, scene.untilTime);

    inboxCtx.clearRect(offsetX, 0, boundaryWidth, height);

    const tempCanvas = document.createElement('canvas');
    const tempCtx = DrawHelper.createHiDPICanvas(
      tempCanvas,
      boundaryWidth,
      height,
    );
    DrawHelper.setAntiAliasing(tempCtx);

    DrawImageHelper.drawCanvasLogical(
      tempCtx,
      renderCanvas,
      0,
      0,
      boundaryWidth,
      height,
    );

    const logicalDimensions = DrawImageHelper.getLogicalDimensions(renderCanvas);
    renderCtx.clearRect(
      0,
      0,
      logicalDimensions.width,
      logicalDimensions.height,
    );
    renderCtx.fillStyle = this.gridColorService.backGroundColor;
    renderCtx.fillRect(
      0,
      0,
      logicalDimensions.width,
      logicalDimensions.height,
    );
    this.boundaryRenderService.drawRedBoundaryLines(renderCtx, boundaryWidth, height, scene.fromTime, scene.untilTime);

    scene.shifts.forEach((shift) => {
      if (shift !== draggedShift) {
        this.shiftBoxRenderService.drawSingleShiftBox(
          renderCtx,
          shift,
          range,
          boxWidth,
          marginLeftRight,
          height,
          false,
          scene.shifts,
          scene.shiftRectangles,
        );
      }
    });

    DrawImageHelper.drawCanvasLogical(
      inboxCtx,
      renderCanvas,
      offsetX,
      0,
      boundaryWidth,
      height,
    );

    inboxCtx.save();
    inboxCtx.translate(offsetX, 0);
    const draggedRect = this.shiftBoxRenderService.drawSingleShiftBox(
      inboxCtx,
      draggedShift,
      range,
      boxWidth,
      marginLeftRight,
      height,
      true,
      scene.shifts,
      scene.shiftRectangles,
    );
    inboxCtx.restore();

    if (draggedRect) {
      scene.shiftRectangles.set(draggedShift, draggedRect);
    }

    const renderLogicalDimensions = DrawImageHelper.getLogicalDimensions(renderCanvas);
    renderCtx.clearRect(
      0,
      0,
      renderLogicalDimensions.width,
      renderLogicalDimensions.height
    );
    DrawImageHelper.drawCanvasLogical(
      renderCtx,
      tempCanvas,
      0,
      0,
      boundaryWidth,
      height
    );
  }
}

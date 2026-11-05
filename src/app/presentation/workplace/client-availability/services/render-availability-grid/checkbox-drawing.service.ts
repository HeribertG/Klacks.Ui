// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pre-draws one small canvas per availability display state, which the cell templates copy:
 * empty box, checkmark (can work), strong cross (explicitly blocked), thin grey cross (blocked by the day rule)
 * and a dash for a cell group whose hours differ. The same symbols are offered as data URLs for the legend.
 */

import { Injectable, inject, signal } from '@angular/core';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { AvailabilityDisplayState } from 'src/app/domain/models/client-availability/availability-display-state.enum';

@Injectable()
export class CheckboxDrawingService {
  private gridColors = inject(GridColorService);

  private static readonly CHECKBOX_SIZE = 16;
  private static readonly BORDER_RADIUS = 3;
  private static readonly BORDER_INSET = 0.5;
  private static readonly BORDER_LINE_WIDTH = 1;
  private static readonly CHECKMARK_LINE_WIDTH = 2;
  private static readonly STRONG_CROSS_LINE_WIDTH = 2;
  private static readonly WEAK_CROSS_LINE_WIDTH = 1;
  private static readonly WEAK_CROSS_ALPHA = 0.55;
  private static readonly CROSS_INSET = 4.5;
  private static readonly MIXED_DASH_INSET = 4.5;
  private static readonly MIXED_DASH_LINE_WIDTH = 2;
  private static readonly SYMBOL_ON_FILL_COLOR = '#ffffff';
  private static readonly FALLBACK_CHECK_COLOR = '#4CAF50';
  private static readonly FALLBACK_BORDER_COLOR = '#999999';
  private static readonly CHECKMARK_POINTS: readonly (readonly [number, number])[] = [[3.5, 8], [6.5, 11.5], [12.5, 4.5]];

  private canvases = new Map<AvailabilityDisplayState, HTMLCanvasElement>();

  public readonly symbolDataUrls = signal<ReadonlyMap<AvailabilityDisplayState, string>>(new Map());

  public initialize(): void {
    this.canvases.clear();
    this.canvases.set(AvailabilityDisplayState.Empty, this.createEmptyCanvas());
    this.canvases.set(AvailabilityDisplayState.Available, this.createCheckedCanvas());
    this.canvases.set(AvailabilityDisplayState.Blocked, this.createBlockedCanvas());
    this.canvases.set(AvailabilityDisplayState.DerivedBlocked, this.createDerivedBlockedCanvas());
    this.canvases.set(AvailabilityDisplayState.Mixed, this.createMixedCanvas());

    const urls = new Map<AvailabilityDisplayState, string>();
    for (const [state, canvas] of this.canvases) {
      urls.set(state, canvas.toDataURL());
    }
    this.symbolDataUrls.set(urls);
  }

  public getCanvas(state: AvailabilityDisplayState): HTMLCanvasElement | undefined {
    return this.canvases.get(state);
  }

  public get checkboxSize(): number {
    return CheckboxDrawingService.CHECKBOX_SIZE;
  }

  private createCheckedCanvas(): HTMLCanvasElement {
    return this.createCanvas((ctx, size) => {
      this.fillBox(ctx, size, this.gridColors.focusBorderColor ?? CheckboxDrawingService.FALLBACK_CHECK_COLOR);
      ctx.strokeStyle = CheckboxDrawingService.SYMBOL_ON_FILL_COLOR;
      ctx.lineWidth = CheckboxDrawingService.CHECKMARK_LINE_WIDTH;
      ctx.beginPath();
      const [first, ...rest] = CheckboxDrawingService.CHECKMARK_POINTS;
      ctx.moveTo(first[0], first[1]);
      for (const [x, y] of rest) {
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
  }

  private createBlockedCanvas(): HTMLCanvasElement {
    return this.createCanvas((ctx, size) => {
      this.fillBox(ctx, size, this.gridColors.availabilityBlockedColor);
      this.drawCross(ctx, size, CheckboxDrawingService.SYMBOL_ON_FILL_COLOR, CheckboxDrawingService.STRONG_CROSS_LINE_WIDTH);
    });
  }

  private createDerivedBlockedCanvas(): HTMLCanvasElement {
    return this.createCanvas((ctx, size) => {
      this.strokeBox(ctx, size);
      ctx.globalAlpha = CheckboxDrawingService.WEAK_CROSS_ALPHA;
      this.drawCross(ctx, size, this.borderColor(), CheckboxDrawingService.WEAK_CROSS_LINE_WIDTH);
    });
  }

  private createMixedCanvas(): HTMLCanvasElement {
    return this.createCanvas((ctx, size) => {
      this.strokeBox(ctx, size);
      const inset = CheckboxDrawingService.MIXED_DASH_INSET;
      ctx.strokeStyle = this.gridColors.focusBorderColor ?? CheckboxDrawingService.FALLBACK_CHECK_COLOR;
      ctx.lineWidth = CheckboxDrawingService.MIXED_DASH_LINE_WIDTH;
      ctx.beginPath();
      ctx.moveTo(inset, size / 2);
      ctx.lineTo(size - inset, size / 2);
      ctx.stroke();
    });
  }

  private createEmptyCanvas(): HTMLCanvasElement {
    return this.createCanvas((ctx, size) => this.strokeBox(ctx, size));
  }

  private createCanvas(draw: (ctx: CanvasRenderingContext2D, size: number) => void): HTMLCanvasElement {
    const size = CheckboxDrawingService.CHECKBOX_SIZE;
    const ratio = DrawHelper.pixelRatio();
    const canvas = document.createElement('canvas');
    canvas.width = size * ratio;
    canvas.height = size * ratio;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(ratio, ratio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    draw(ctx, size);
    return canvas;
  }

  private fillBox(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    ctx.fillStyle = color;
    this.boxPath(ctx, size);
    ctx.fill();
  }

  private strokeBox(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.strokeStyle = this.borderColor();
    ctx.lineWidth = CheckboxDrawingService.BORDER_LINE_WIDTH;
    this.boxPath(ctx, size);
    ctx.stroke();
  }

  private drawCross(ctx: CanvasRenderingContext2D, size: number, color: string, lineWidth: number): void {
    const inset = CheckboxDrawingService.CROSS_INSET;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(inset, inset);
    ctx.lineTo(size - inset, size - inset);
    ctx.moveTo(size - inset, inset);
    ctx.lineTo(inset, size - inset);
    ctx.stroke();
  }

  private borderColor(): string {
    return this.gridColors.borderColor ?? CheckboxDrawingService.FALLBACK_BORDER_COLOR;
  }

  private boxPath(ctx: CanvasRenderingContext2D, size: number): void {
    const inset = CheckboxDrawingService.BORDER_INSET;
    this.drawRoundRect(ctx, inset, inset, size - 2 * inset, size - 2 * inset, CheckboxDrawingService.BORDER_RADIUS);
  }

  private drawRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

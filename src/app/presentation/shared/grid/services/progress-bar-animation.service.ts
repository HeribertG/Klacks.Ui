import { Injectable } from '@angular/core';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';

export interface ProgressBarConfig {
  color?: string;
  height?: number;
  position?: 'top' | 'bottom';
  animationSpeed?: number;
}

const DEFAULT_CONFIG: Required<ProgressBarConfig> = {
  color: '#4CAF50',
  height: 2,
  position: 'bottom',
  animationSpeed: 0.15,
};

@Injectable()
export class ProgressBarAnimationService {
  private displayedProgress = 0;
  private targetProgress = 0;
  private animationFrameId: number | null = null;
  private renderCallback: (() => void) | null = null;
  private config: Required<ProgressBarConfig> = { ...DEFAULT_CONFIG };

  configure(config: ProgressBarConfig): void {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setRenderCallback(callback: () => void): void {
    this.renderCallback = callback;
  }

  setProgress(progress: number): void {
    this.targetProgress = progress;

    if (progress >= 100 || progress === 0) {
      this.displayedProgress = 0;
      this.cancelAnimation();
      return;
    }

    this.scheduleAnimation();
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.displayedProgress <= 0) return;

    const dpr = DrawHelper.pixelRatio();
    const barHeight = this.config.height * dpr;
    const progressWidth = (width * this.displayedProgress) / 100;

    const y = this.config.position === 'top' ? 0 : height - barHeight - 1;

    ctx.save();
    ctx.fillStyle = this.config.color;
    ctx.fillRect(0, y, progressWidth, barHeight);
    ctx.restore();
  }

  drawInRect(
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    width: number,
    height: number
  ): void {
    if (this.displayedProgress <= 0) return;

    const dpr = DrawHelper.pixelRatio();
    const barHeight = this.config.height * dpr;
    const progressWidth = (width * this.displayedProgress) / 100;

    const y = this.config.position === 'top' ? top : top + height - barHeight - 1;

    ctx.save();
    ctx.fillStyle = this.config.color;
    ctx.fillRect(left, y, progressWidth, barHeight);
    ctx.restore();
  }

  reset(): void {
    this.displayedProgress = 0;
    this.targetProgress = 0;
    this.cancelAnimation();
  }

  destroy(): void {
    this.cancelAnimation();
    this.renderCallback = null;
  }

  private scheduleAnimation(): void {
    if (this.animationFrameId !== null) return;

    this.animationFrameId = requestAnimationFrame(() => {
      this.animationFrameId = null;
      this.updateAnimation();
    });
  }

  private updateAnimation(): void {
    const diff = this.targetProgress - this.displayedProgress;

    if (Math.abs(diff) > 0.5) {
      this.displayedProgress += diff * this.config.animationSpeed;
      this.triggerRender();
      this.scheduleAnimation();
    } else {
      this.displayedProgress = this.targetProgress;
      this.triggerRender();
    }
  }

  private triggerRender(): void {
    if (this.renderCallback) {
      this.renderCallback();
    }
  }

  private cancelAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

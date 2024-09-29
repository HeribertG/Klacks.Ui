import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  HostListener,
  NgZone,
} from '@angular/core';

@Component({
  selector: 'app-h-scrollbar',
  templateUrl: './h-scrollbar.component.html',
  styleUrls: ['./h-scrollbar.component.scss'],
})
export class HScrollbarComponent implements AfterViewInit, OnChanges {
  @Input() value = 0;
  @Input() maxValue = 100;
  @Output() valueChange = new EventEmitter<number>();

  @ViewChild('canvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx: CanvasRenderingContext2D | null = null;
  private thumbLength = 0;
  private tickSize = 0;
  private isDragging = false;
  private startDragX = 0;
  private startDragValue = 0;
  private moveAnimationValue = 0;
  private moveAnimationFrameCount = 0;
  private moveAnimationFrameModulo = 10;
  private frameRequests: number[] = [];
  private shouldStopAnimation = false;

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
    this.initCanvas();
    this.draw();
  }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['value'] || changes['maxValue']) && this.ctx) {
      this.calcMetrics();
      this.draw();
    }
  }

  private initCanvas() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    if (this.ctx) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      this.calcMetrics();
    }
  }

  private calcMetrics() {
    if (this.ctx) {
      const w = this.ctx.canvas.width;
      this.thumbLength = Math.max(w * (w / (this.maxValue + w)), 20);
      this.tickSize = (w - this.thumbLength) / this.maxValue;
    }
  }

  private draw() {
    if (this.ctx) {
      const { width, height } = this.ctx.canvas;
      this.ctx.clearRect(0, 0, width, height);

      // Draw track
      this.ctx.fillStyle = '#e0e0e0';
      this.ctx.fillRect(0, 0, width, height);

      // Draw thumb
      const thumbX = this.value * this.tickSize;
      this.ctx.fillStyle = '#808080';
      this.ctx.fillRect(thumbX, 0, this.thumbLength, height);
    }
  }

  onMouseDown(event: MouseEvent) {
    this.isDragging = true;
    this.startDragX = event.clientX;
    this.startDragValue = this.value;
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.isDragging) {
      const deltaX = event.clientX - this.startDragX;
      const deltaValue = Math.round(deltaX / this.tickSize);
      let newValue = this.startDragValue + deltaValue;
      newValue = Math.max(0, Math.min(newValue, this.maxValue));

      if (newValue !== this.value) {
        this.value = newValue;
        this.valueChange.emit(this.value);
        this.draw();
      }
    }
  }

  @HostListener('window:mouseup')
  onMouseUp() {
    this.isDragging = false;
  }

  onArrowThumbMouseDown(event: MouseEvent, direction: number) {
    event.preventDefault();
    event.stopPropagation();

    this.moveAnimationValue = direction === 0 ? -1 : 1;
    this.moveAnimationFrameModulo = 1;
    this.shouldStopAnimation = false;
    this.moveAnimation(1);
  }

  onArrowThumbMouseUp(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.stopMoveAnimation();
  }

  private moveAnimation(steps: number) {
    this.zone.runOutsideAngular(() => {
      this.moveAnimationFrameCount++;

      if (this.shouldStopAnimation) return;

      if (
        this.moveAnimationFrameModulo <= 1 ||
        this.moveAnimationFrameCount % this.moveAnimationFrameModulo === 0
      ) {
        if (this.moveAnimationFrameModulo > 1) {
          this.moveAnimationFrameModulo--;
        }
        this.updateValue(this.value + steps * this.moveAnimationValue);
      }

      const requestId = window.requestAnimationFrame(() => {
        this.frameRequests.push(requestId);
        this.moveAnimation(steps);
      });
    });
  }

  private stopMoveAnimation() {
    this.shouldStopAnimation = true;
    this.moveAnimationFrameCount = 0;
    this.moveAnimationValue = 0;
    this.frameRequests.forEach((requestId) =>
      window.cancelAnimationFrame(requestId)
    );
    this.frameRequests = [];
  }

  private updateValue(newValue: number) {
    newValue = Math.max(0, Math.min(newValue, this.maxValue));
    if (newValue !== this.value) {
      this.value = newValue;
      this.valueChange.emit(this.value);
      this.draw();
    }
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
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
} from '@angular/core';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { ContextMenuComponent } from 'src/app/shared/context-menu/context-menu.component';
import { SelectedArea } from 'src/app/shared/grid/enums/breaks_enums';
import { Subject } from 'rxjs';
import { DataManagementScheduleService } from 'src/app/data/management/data-management-schedule.service';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';
import { BaseSettingsService } from 'src/app/shared/grid/services/data-setting/settings.service';
import { BaseDataService } from 'src/app/shared/grid/services/data-setting/data.service';
import { BaseDrawScheduleService } from 'src/app/shared/grid/services/body/draw-schedule.service';
import { ScheduleTemplateEventsDirective } from '../directives/schedule-template-events.directive';

@Component({
  selector: 'app-schedule-surface-template',
  templateUrl: './schedule-surface-template.component.html',
  standalone: true,
  imports: [ContextMenuComponent, ScheduleTemplateEventsDirective],
})
export class ScheduleSurfaceTemplateComponent
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

  @ViewChild('boxTemplate') boxTemplate!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasTemplateRef', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  public dataManagement = inject(DataManagementScheduleService);
  public dataService = inject(BaseDataService);
  public scroll = inject(ScrollService);
  public drawSchedule = inject(BaseDrawScheduleService);
  public settings = inject(BaseSettingsService);

  private readonly el = inject<ElementRef<HTMLCanvasElement>>(ElementRef);
  private cdr = inject(ChangeDetectorRef);
  private injector = inject(Injector);

  public selectedArea: SelectedArea = SelectedArea.None;
  public isLeftMouseDown = false;
  public canvasId = `-${Math.random().toString(36).substring(2, 10)}`;

  private tooltip: HTMLDivElement | undefined;
  private _pixelRatio = 1;
  private ngUnsubscribe = new Subject<void>();
  private effects: EffectRef[] = [];

  private resizeObserver?: ResizeObserver;
  private lastWidth = 0;
  private lastHeight = 0;
  private readonly RESIZE_THRESHOLD = 2;

  ngOnInit(): void {
    this.readSignals();
    this._pixelRatio = DrawHelper.pixelRatio();
    this.drawSchedule.refresh();
    this.tooltip = document.getElementById('tooltip') as HTMLDivElement;
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.drawSchedule.createCanvas(canvas);
    //this.initializeDrawSchedule();
    this.observeParentResize();
  }

  ngOnDestroy(): void {
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
        this.scroll.horizontalScrollPosition = currH;
        this.scroll.updateScrollPosition(
          currH,
          this.scroll.verticalScrollPosition
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
          currV
        );
        vDirection = true;
      }
    }

    if (vDirection || hDirection) {
      this.drawSchedule.moveGrid();
    }
  }

  setFocus(): void {
    const x = this.el.nativeElement;
    if (x) {
      x.focus();
      this.drawSchedule.isFocused = true;
    }
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
        this.nameId
      );
    }
  }

  private handleParentResize(entries: ResizeObserverEntry[]): void {
    if (!this.drawSchedule.isCanvasAvailable()) {
      console.warn('[TEMPLATE] resize skipped – canvas not ready', this.nameId);
      return;
    }

    if (entries?.length > 0) {
      const entry = entries[0];
      const newWidth = Math.round(entry.contentRect.width);
      const newHeight = Math.round(entry.contentRect.height);

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
        this.updateScrollbarValues();
      }
    }
  }

  private initializeDrawSchedule(): void {
    const canvas = this.canvasRef.nativeElement;
    const box = this.boxTemplate.nativeElement;
    this.drawSchedule.createCanvas(canvas);
    this.drawSchedule.width = box.clientWidth;
    this.drawSchedule.height = box.clientHeight;
    this.drawSchedule.refresh();
    this.updateScrollbarValues();
  }

  private updateDrawScheduleDimensions(rec: DOMRectReadOnly): void {
    this.drawSchedule.width = rec.width;
    this.drawSchedule.height = rec.height;
    this.drawSchedule.refresh();
  }

  private checkPixelRatio(): void {
    const pixelRatio = DrawHelper.pixelRatio();

    if (this._pixelRatio !== pixelRatio) {
      const canvas = this.canvasRef.nativeElement;
      this._pixelRatio = pixelRatio;
      this.drawSchedule.createCanvas(canvas);
      this.drawSchedule.rebuild();
      this.drawSchedule.redraw();
    }
  }

  private updateScrollbarValues(): void {
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

  showToolTip({ value, event }: { value: any; event: MouseEvent }) {
    if (this.tooltip && this.tooltip.innerHTML !== value) {
      this.tooltip.innerHTML = value;
      this.tooltip.style.top = `${event.clientY}px`;
      this.tooltip.style.left = `${event.clientX}px`;
      this.fadeInToolTip();
    }
  }

  hideToolTip() {
    if (this.tooltip && parseFloat(this.tooltip.style.opacity) >= 0.9) {
      this.fadeOutToolTip();
    }
  }

  private fadeInToolTip() {
    if (!this.tooltip) return;
    let op = 0.1;
    this.tooltip.style.display = 'block';
    const timer = setInterval(() => {
      if (op >= 0.9) {
        clearInterval(timer);
        this.tooltip!.style.opacity = '1';
      } else {
        this.tooltip!.style.opacity = op.toString();
        op += op * 0.1;
      }
    }, 20);
  }

  private fadeOutToolTip() {
    if (!this.tooltip) return;
    let op = 1;
    const timer = setInterval(() => {
      if (op <= 0.1) {
        clearInterval(timer);
        this.tooltip!.style.opacity = '0';
        this.tooltip!.style.display = 'none';
        this.tooltip!.innerHTML = '';
        this.tooltip!.style.top = '-9000px';
        this.tooltip!.style.left = '-9000px';
      } else {
        this.tooltip!.style.opacity = op.toString();
        op -= op * 0.1;
      }
    }, 50);
  }

  destroyToolTip() {
    if (this.tooltip) {
      this.tooltip.style.opacity = '0';
      this.tooltip.style.display = 'none';
      this.tooltip.innerHTML = '';
      this.tooltip.style.top = '-9000px';
      this.tooltip.style.left = '-9000px';
    }
  }

  clearMenus() {
    // Implementieren wenn nötig
  }

  onContextMenuAction(_: any) {
    // Implementieren wenn nötig
  }

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      const dataReadEffect = effect(() => {
        if (this.dataManagement.isRead()) {
          this.dataService.setMetrics();
          this.scroll.horizontalScrollPosition = 0;
          this.scroll.verticalScrollPosition = 0;
          this.valueHScrollbar.emit(0);
          this.valueVScrollbar.emit(0);
          this.updateScrollbarValues();
        }
      });
      this.effects.push(dataReadEffect);

      const zoomEffect = effect(() => {
        this.settings.zoomSignal();
        setTimeout(() => {
          if (this.drawSchedule.isCanvasAvailable()) {
            const canvas = this.canvasRef.nativeElement;
            this.drawSchedule.createCanvas(canvas);
            this.drawSchedule.rebuild();
            this.drawSchedule.redraw();
            this.updateScrollbarValues();
          }
        }, 0);
      });
      this.effects.push(zoomEffect);

      const refreshEffect = effect(() => {
        this.dataService.refreshSignal();
        this.drawSchedule.redraw();
        this.updateScrollbarValues();
        this.cdr.detectChanges();
      });
      this.effects.push(refreshEffect);
    });
  }
}

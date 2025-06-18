/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common/common_module.d-NEF7UaHr';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  effect,
  EffectRef,
  ElementRef,
  EventEmitter,
  inject,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  runInInjectionContext,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Subject } from 'rxjs';
import { ResizeDirective } from 'src/app/directives/resize.directive';
import { SharedModule } from 'src/app/shared/shared.module';

export interface ICanvasRenderer {
  createCanvas(): void;
  deleteCanvas(): void;
  refresh(): void;
  redraw(): void;
  rebuild(): void;
  moveGrid(): void;
  isCanvasAvailable(): boolean;
  width: number;
  height: number;
  isFocused: boolean;
}

export interface ICanvasDataService {
  columns: number;
  rows: number;
  setMetrics(): void;
  refreshSignal(): any;
}

export interface ICanvasSettings {
  cellWidth: number;
  cellHeight: number;
  zoomSignal(): any;
}

export interface ICanvasScrollService {
  horizontalScrollPosition: number;
  verticalScrollPosition: number;
  updateScrollPosition(horizontal: number, vertical: number): void;
}

export interface ICanvasEventHandlers {
  onContextMenu?: (event: MouseEvent) => void;
  onTooltipShow?: (value: any, event: MouseEvent) => void;
  onTooltipHide?: () => void;
  onFocus?: () => void;
}

export interface ITooltipConfig {
  fadeInDuration?: number;
  fadeOutDuration?: number;
  fadeOutSlowDuration?: number;
}

@Component({
  selector: 'app-grid-surface',
  templateUrl: './grid-surface.component.html',
  styleUrl: './grid-surface.component.scss',
  standalone: true,
  imports: [CommonModule, ResizeDirective, SharedModule],
})
export class GridSurfaceComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  // ===================================================================
  // INPUTS - Was von außen konfiguriert werden kann
  // ===================================================================

  // Pflicht-Services (müssen immer übergeben werden)
  @Input({ required: true }) renderer!: ICanvasRenderer;
  @Input({ required: true }) dataService!: ICanvasDataService;
  @Input({ required: true }) settings!: ICanvasSettings;
  @Input({ required: true }) scrollService!: ICanvasScrollService;

  // Optionale Konfiguration
  @Input() canvasId = 'canvas';
  @Input() tooltipId = 'tooltip';
  @Input() containerClasses: string | string[] = [];
  @Input() canvasClasses: string | string[] = [];
  @Input() tooltipClasses: string | string[] = [];
  @Input() tabIndex = 0;
  @Input() role = 'application';
  @Input() ariaLabel = 'Interactive Canvas';
  @Input() tooltipConfig: ITooltipConfig = {};
  @Input() eventHandlers: ICanvasEventHandlers = {};

  // Scrollbar-Werte von außen
  @Input() valueChangeHScrollbar = 0;
  @Input() valueChangeVScrollbar = 0;

  // ===================================================================
  // OUTPUTS - Was der Component nach außen kommuniziert
  // ===================================================================

  @Output() valueHScrollbar = new EventEmitter<number>();
  @Output() maxValueHScrollbar = new EventEmitter<number>();
  @Output() visibleValueHScrollbar = new EventEmitter<number>();
  @Output() valueVScrollbar = new EventEmitter<number>();
  @Output() maxValueVScrollbar = new EventEmitter<number>();
  @Output() visibleValueVScrollbar = new EventEmitter<number>();
  @Output() canvasReady = new EventEmitter<void>();
  @Output() canvasResized = new EventEmitter<{
    width: number;
    height: number;
  }>();

  // ===================================================================
  // VIEW CHILDREN & SERVICES
  // ===================================================================

  @ViewChild('canvasContainer') canvasContainer!: ElementRef<HTMLDivElement>;

  private cdr = inject(ChangeDetectorRef);
  private injector = inject(Injector);

  // ===================================================================
  // PRIVATE PROPERTIES
  // ===================================================================

  private tooltip: HTMLDivElement | undefined;
  private _pixelRatio = 1;
  private ngUnsubscribe = new Subject<void>();
  private effects: EffectRef[] = [];

  // ===================================================================
  // LIFECYCLE HOOKS
  // ===================================================================

  ngOnInit(): void {
    this.initializeTooltipConfig();
    this.setupSignalEffects();
    this._pixelRatio = this.getPixelRatio();
    this.renderer.refresh();
    this.tooltip = document.getElementById(this.tooltipId) as HTMLDivElement;
  }

  ngAfterViewInit(): void {
    this.initializeCanvas();
    this.canvasReady.emit();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.handleScrollChanges(changes);
  }

  ngOnDestroy(): void {
    // Cleanup
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this.renderer.deleteCanvas();
    this.effects.forEach((effect) => effect?.destroy());
    this.effects = [];
  }

  // ===================================================================
  // PUBLIC API - Methoden die von außen aufgerufen werden können
  // ===================================================================

  public setFocus(): void {
    const canvas = document.getElementById(this.canvasId) as HTMLCanvasElement;
    if (canvas) {
      canvas.focus();
      this.renderer.isFocused = true;
      this.eventHandlers.onFocus?.();
    }
  }

  public moveGrid(): void {
    this.renderer.moveGrid();
    this.valueHScrollbar.emit(this.scrollService.horizontalScrollPosition);
    this.valueVScrollbar.emit(this.scrollService.verticalScrollPosition);
  }

  public showTooltip(value: any, event: MouseEvent): void {
    if (this.tooltip && this.tooltip.innerHTML !== value) {
      this.tooltip.innerHTML = value;
      this.tooltip.style.top = `${event.clientY}px`;
      this.tooltip.style.left = `${event.clientX}px`;
      this.fadeInTooltip();
      this.eventHandlers.onTooltipShow?.(value, event);
    }
  }

  public hideTooltip(): void {
    if (this.tooltip) {
      const op = parseFloat(this.tooltip.style.opacity);
      if (!isNaN(op) && op >= 0.9) {
        this.fadeOutTooltip();
        this.eventHandlers.onTooltipHide?.();
      }
    }
  }

  public destroyTooltip(): void {
    if (this.tooltip) {
      this.tooltip.style.opacity = '0';
      this.tooltip.style.display = 'none';
      this.tooltip.innerHTML = '';
      this.tooltip.style.top = '-9000px';
      this.tooltip.style.left = '-9000px';
    }
  }

  // ===================================================================
  // EVENT HANDLERS
  // ===================================================================

  onResize(entries: ResizeObserverEntry[]): void {
    if (entries?.length > 0) {
      const element = entries[0].target as HTMLElement;
      this.updateCanvasDimensions(element);
      this.checkPixelRatio();
      this.updateScrollbarValues();
    }
  }

  onContextMenu(event: MouseEvent): void {
    this.eventHandlers.onContextMenu?.(event);
  }

  // ===================================================================
  // PRIVATE METHODS
  // ===================================================================

  private initializeTooltipConfig(): void {
    this.tooltipConfig = {
      fadeInDuration: 20,
      fadeOutDuration: 50,
      fadeOutSlowDuration: 100,
      ...this.tooltipConfig,
    };
  }

  private initializeCanvas(): void {
    this.renderer.createCanvas();
    const container = this.canvasContainer.nativeElement;
    this.renderer.width = container.clientWidth;
    this.renderer.height = container.clientHeight;
    this.renderer.refresh();
    this.updateScrollbarValues();
  }

  private handleScrollChanges(changes: SimpleChanges): void {
    let shouldMoveGrid = false;

    // Horizontales Scrollen
    if (changes['valueChangeHScrollbar']) {
      const prev = changes['valueChangeHScrollbar'].previousValue;
      const curr = changes['valueChangeHScrollbar'].currentValue;
      if (curr !== prev) {
        this.scrollService.horizontalScrollPosition = curr;
        this.scrollService.updateScrollPosition(
          curr,
          this.scrollService.verticalScrollPosition
        );
        shouldMoveGrid = true;
      }
    }

    // Vertikales Scrollen
    if (changes['valueChangeVScrollbar']) {
      const prev = changes['valueChangeVScrollbar'].previousValue;
      const curr = changes['valueChangeVScrollbar'].currentValue;
      if (curr !== prev) {
        this.scrollService.verticalScrollPosition = curr;
        this.scrollService.updateScrollPosition(
          this.scrollService.horizontalScrollPosition,
          curr
        );
        shouldMoveGrid = true;
      }
    }

    if (shouldMoveGrid) {
      this.renderer.moveGrid();
    }
  }

  private updateCanvasDimensions(element: Element): void {
    const newWidth = element.clientWidth;
    const newHeight = element.clientHeight;

    this.renderer.width = newWidth;
    this.renderer.height = newHeight;
    this.renderer.refresh();

    this.canvasResized.emit({ width: newWidth, height: newHeight });
  }

  private checkPixelRatio(): void {
    const pixelRatio = this.getPixelRatio();
    if (this._pixelRatio !== pixelRatio) {
      this._pixelRatio = pixelRatio;
      this.renderer.createCanvas();
      this.renderer.rebuild();
      this.renderer.redraw();
    }
  }

  private getPixelRatio(): number {
    return window.devicePixelRatio || 1;
  }

  // ===================================================================
  // SCROLLBAR LOGIC
  // ===================================================================

  private updateScrollbarValues(): void {
    this.updateHorizontalScrollbarValues();
    this.updateVerticalScrollbarValues();
  }

  private updateHorizontalScrollbarValues(): void {
    this.maxValueHScrollbar.emit(this.dataService.columns);
    this.visibleValueHScrollbar.emit(this.calculateVisibleColumns());
    this.valueHScrollbar.emit(this.scrollService.horizontalScrollPosition);
  }

  private updateVerticalScrollbarValues(): void {
    this.maxValueVScrollbar.emit(this.dataService.rows);
    this.visibleValueVScrollbar.emit(this.calculateVisibleRows());
    this.valueVScrollbar.emit(this.scrollService.verticalScrollPosition);
  }

  private calculateVisibleColumns(): number {
    if (!this.renderer.isCanvasAvailable()) return 1;
    return Math.ceil(this.renderer.width / this.settings.cellWidth);
  }

  private calculateVisibleRows(): number {
    if (!this.renderer.isCanvasAvailable()) return 1;
    return Math.ceil(this.renderer.height / this.settings.cellHeight);
  }

  // ===================================================================
  // TOOLTIP ANIMATIONS
  // ===================================================================

  private fadeInTooltip(): void {
    if (!this.tooltip) return;

    let opacity = 0.1;
    this.tooltip.style.display = 'block';

    const timer = setInterval(() => {
      if (opacity >= 0.9) {
        clearInterval(timer);
        this.tooltip!.style.opacity = '1';
      } else {
        this.tooltip!.style.opacity = opacity.toString();
        opacity += opacity * 0.1;
      }
    }, this.tooltipConfig.fadeInDuration);
  }

  private fadeOutTooltip(slow = false): void {
    if (!this.tooltip) return;

    let opacity = 1;
    const duration = slow
      ? this.tooltipConfig.fadeOutSlowDuration
      : this.tooltipConfig.fadeOutDuration;

    const timer = setInterval(() => {
      if (opacity <= 0.1) {
        clearInterval(timer);
        this.tooltip!.style.opacity = '0';
        this.tooltip!.style.display = 'none';
        this.tooltip!.innerHTML = '';
        this.tooltip!.style.top = '-9000px';
        this.tooltip!.style.left = '-9000px';
      } else {
        this.tooltip!.style.opacity = opacity.toString();
        opacity -= opacity * 0.1;
      }
    }, duration);
  }

  // ===================================================================
  // SIGNAL EFFECTS - Reagiert auf Änderungen in Services
  // ===================================================================

  private setupSignalEffects(): void {
    runInInjectionContext(this.injector, () => {
      // Daten wurden geladen/geändert
      const dataEffect = effect(() => {
        if (this.dataService.refreshSignal) {
          this.dataService.setMetrics();
          this.scrollService.horizontalScrollPosition = 0;
          this.scrollService.verticalScrollPosition = 0;
          this.valueHScrollbar.emit(0);
          this.valueVScrollbar.emit(0);
          this.updateScrollbarValues();
        }
      });
      this.effects.push(dataEffect);

      // Zoom wurde geändert
      const zoomEffect = effect(() => {
        if (this.settings.zoomSignal) {
          this.settings.zoomSignal();
          setTimeout(() => {
            if (this.renderer.isCanvasAvailable()) {
              this.renderer.createCanvas();
              this.renderer.rebuild();
              this.renderer.redraw();
              this.updateScrollbarValues();
            }
          }, 0);
        }
      });
      this.effects.push(zoomEffect);

      // Refresh wurde ausgelöst
      const refreshEffect = effect(() => {
        if (this.dataService.refreshSignal) {
          this.dataService.refreshSignal();
          this.renderer.redraw();
          this.updateScrollbarValues();
          this.cdr.detectChanges();
        }
      });
      this.effects.push(refreshEffect);
    });
  }
}

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
import { CommonModule } from '@angular/common';
import { ResizeDirective } from 'src/app/directives/resize.directive';
import { SharedModule } from 'src/app/shared/shared.module';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';
import { DataService } from '../schedule-section/services/data.service';
import { DrawScheduleService } from '../schedule-section/services/draw-schedule.service';
import { SettingsService } from '../schedule-section/services/settings.service';
import { ScheduleEventsDirective } from '../schedule-section/directives/schedule-events.directive';

@Component({
  selector: 'app-schedule-schedule-surface',
  templateUrl: './schedule-schedule-surface.component.html',
  styleUrls: ['./schedule-schedule-surface.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ContextMenuComponent,
    ScheduleEventsDirective,
    ResizeDirective,
    SharedModule,
  ],
  providers: [],
})
export class ScheduleScheduleSurfaceComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @Input() contextMenu: ContextMenuComponent | undefined;
  @Input() valueChangeHScrollbar!: number;
  @Input() valueChangeVScrollbar!: number;

  @Output() valueHScrollbar = new EventEmitter<number>();
  @Output() maxValueHScrollbar = new EventEmitter<number>();
  @Output() visibleValueHScrollbar = new EventEmitter<number>();
  @Output() valueVScrollbar = new EventEmitter<number>();
  @Output() maxValueVScrollbar = new EventEmitter<number>();
  @Output() visibleValueVScrollbar = new EventEmitter<number>();
  @ViewChild('boxSchedule') boxSchedule!: ElementRef<HTMLDivElement>;

  public dataManagementSchedule = inject(DataManagementScheduleService);
  public dataService = inject(DataService);
  public scroll = inject(ScrollService);
  public drawSchedule = inject(DrawScheduleService);
  private readonly el = inject<ElementRef<HTMLCanvasElement>>(ElementRef);
  private settings = inject(SettingsService);
  private cdr = inject(ChangeDetectorRef);
  private injector = inject(Injector);

  public selectedArea: SelectedArea = SelectedArea.None;
  public isLeftMouseDown = false;

  private tooltip: HTMLDivElement | undefined;
  private _pixelRatio = 1;

  private ngUnsubscribe = new Subject<void>();
  private effects: EffectRef[] = [];

  /* #region ng */
  ngOnInit(): void {
    this.readSignals();

    this._pixelRatio = DrawHelper.pixelRatio();
    this.drawSchedule.refresh();
    this.tooltip = document.getElementById('tooltip') as HTMLDivElement;
  }

  ngAfterViewInit(): void {
    this.drawSchedule.createCanvas();
    this.initializeDrawSchedule();
  }
  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();

    this.drawSchedule.deleteCanvas();

    this.effects.forEach((effectRef) => {
      if (effectRef) {
        effectRef.destroy();
      }
    });
    this.effects = [];
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

  /* #endregion ng */

  /* #region   resize+visibility */

  private initializeDrawSchedule(): void {
    this.drawSchedule.createCanvas();
    const box = this.boxSchedule.nativeElement;
    this.drawSchedule.width = box.clientWidth;
    this.drawSchedule.height = box.clientHeight;
    this.drawSchedule.refresh();
    this.updateScrollbarValues();
  }

  setFocus(): void {
    const x = this.el.nativeElement;
    if (x) {
      x.focus();
      this.drawSchedule.isFocused = true;
    }
  }

  onResize(entries: ResizeObserverEntry[]): void {
    if (entries && entries.length > 0) {
      const entry = entries[0];
      this.updateDrawScheduleDimensions(entry.target as HTMLElement);
      this.checkPixelRatio();
      this.updateScrollbarValues();
    }
  }

  private updateDrawScheduleDimensions(element: Element): void {
    this.drawSchedule.width = element.clientWidth;
    this.drawSchedule.height = element.clientHeight;
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

  /* #endregion   resize+visibility */

  /* #endregion   render */

  /* #region Scrollbar Integration */
  private updateScrollbarValues(): void {
    this.updateHorizontalScrollbarValues();
    this.updateVerticalScrollbarValues();
  }

  private updateHorizontalScrollbarValues(): void {
    this.maxValueHScrollbar.emit(this.dataService.columns);
    this.visibleValueHScrollbar.emit(this.calculateVisibleColumns());
    this.valueHScrollbar.emit(this.scroll.horizontalScrollPosition);
  }

  private updateVerticalScrollbarValues(): void {
    this.maxValueVScrollbar.emit(this.dataService.rows);
    this.visibleValueVScrollbar.emit(this.calculateVisibleRows());
    this.valueVScrollbar.emit(this.scroll.verticalScrollPosition);
  }

  private calculateVisibleColumns(): number {
    if (!this.drawSchedule.isCanvasAvailable()) {
      return 1;
    }
    return Math.ceil(this.drawSchedule.width / this.settings.cellWidth);
  }

  private calculateVisibleRows(): number {
    if (!this.drawSchedule.isCanvasAvailable()) {
      return 1;
    }
    return Math.ceil(this.drawSchedule.height / this.settings.cellHeight);
  }

  /* #endregion Scrollbar Integration */

  /* #region   render */

  moveGrid(): void {
    this.drawSchedule.moveGrid();
    this.valueHScrollbar.emit(this.scroll.horizontalScrollPosition);
    this.valueVScrollbar.emit(this.scroll.verticalScrollPosition);
  }

  /* #endregion   render */

  /* #region ToolTips */

  // These methods provide fine control over the tooltip's behavior,
  // including its appearance, hiding, and removal,
  // as well as animation effects for an enhanced user experience.

  showToolTip({ value, event }: { value: any; event: MouseEvent }) {
    if (this.tooltip && this.tooltip.innerHTML !== value) {
      this.tooltip.innerHTML = value;
      this.tooltip.style.top = `${event.clientY}px`;
      this.tooltip.style.left = `${event.clientX}px`;
      this.fadeInToolTip();
    }
  }

  hideToolTip() {
    if (this.tooltip) {
      const op = parseFloat(this.tooltip.style.opacity);
      if (!isNaN(op) && op >= 0.9) {
        this.fadeOutToolTip();
      }
    }
  }

  private fadeInToolTip() {
    if (this.tooltip) {
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
  }

  private fadeOutToolTipSlow() {
    if (this.tooltip) {
      let op = 1;

      const timer = setInterval(() => {
        if (op <= 0.1) {
          clearInterval(timer);
          this.tooltip!.style.opacity = '0';
          this.tooltip!.style.display = 'none';
          this.tooltip!.style.top = '-9000px';
          this.tooltip!.style.left = '-9000px';
        } else {
          this.tooltip!.style.opacity = op.toString();
          op -= op * 0.1;
        }
      }, 100);
    }
  }

  private fadeOutToolTip() {
    if (this.tooltip) {
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

  /* #endregion ToolTips */

  /* #region context menu */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  showContextMenu(event: MouseEvent) {
    this.clearMenus();

    // const pos = this.drawSchedule.calcCorrectCoordinate(event);

    // if (
    //   this.drawSchedule.cellManipulation &&
    //   !this.drawSchedule.cellManipulation.isPositionInSelection(pos)
    // ) {
    //   this.destroySelection();
    //   this.drawSchedule.position = pos;
    // }

    // this.subMenus = this.gridCellContextMenu.createContextMenu(pos);
    // this.contextMenuPosition.x = event.clientX + 'px';
    // this.contextMenuPosition.y = event.clientY + 'px';
    // this.contextMenu.menuData = this.subMenus;

    // this.contextMenu.openMenu();
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  onContextMenuAction(event: any) {
    // switch (event.id) {
    //   case MenuIDEnum.emCopy: {
    //     this.cellManipulation.copy();
    //     break;
    //   }
    //   case MenuIDEnum.emCut: {
    //     break;
    //   }
    //   case MenuIDEnum.emPaste: {
    //     break;
    //   }
    // }
  }

  clearMenus() {
    //  this.subMenus = [];
  }
  /* #endregion context menu */

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      const dataReadEffect = effect(() => {
        if (this.dataManagementSchedule.isRead()) {
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
            this.drawSchedule.createCanvas();
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

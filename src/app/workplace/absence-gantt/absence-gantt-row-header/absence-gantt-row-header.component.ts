import {
  AfterViewInit,
  Component,
  EffectRef,
  ElementRef,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  effect,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { Size } from 'src/app/shared/grid/classes/geometry';
import { GridColorService } from 'src/app/shared/grid/services/grid-color.service';
import { GridFontsService } from 'src/app/shared/grid/services/grid-fonts.service';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { DataManagementBreakService } from 'src/app/data/management/data-management-break.service';
import { AbsenceGanttFilterComponent } from './absence-gantt-filter/absence-gantt-filter.component';
import { Subject } from 'rxjs';
import { DrawCalendarGanttService } from 'src/app/workplace/absence-gantt/services/draw-calendar-gantt.service';
import { DrawRowHeaderService } from '../services/draw-row-header.service';
import { CanvasAvailable } from 'src/app/services/canvasAvailable.decorator';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';
import { NgStyle } from '@angular/common';
import { ResizeDirective } from 'src/app/directives/resize.directive';
import { CursorEnum } from 'src/app/shared/grid/enums/cursor_enums';

@Component({
  selector: 'app-absence-gantt-row-header',
  templateUrl: './absence-gantt-row-header.component.html',
  styleUrls: ['./absence-gantt-row-header.component.scss'],
  standalone: true,
  imports: [NgStyle, AbsenceGanttFilterComponent, ResizeDirective],
})
export class AbsenceGanttRowHeaderComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @Input() valueChangeVScrollbar!: number;

  @ViewChild('ganttFilter', { static: false }) filter:
    | AbsenceGanttFilterComponent
    | undefined;
  @ViewChild('boxCalendarRowHeader')
  boxCalendarRowHeader!: ElementRef<HTMLDivElement>;

  public scroll = inject(ScrollService);
  private gridColorService = inject(GridColorService);
  private gridFontsService = inject(GridFontsService);
  private dataManagementBreak = inject(DataManagementBreakService);
  private drawCalendarGanttService = inject(DrawCalendarGanttService);
  private drawRowHeader = inject(DrawRowHeaderService);
  private injector = inject(Injector);

  private ngUnsubscribe = new Subject<void>();
  private effects: EffectRef[] = [];

  filterStyle = {};

  /* #region dom */
  private set currentCursor(cursor: CursorEnum) {
    document.body.style.cursor = cursor;
  }

  private get currentCursor(): CursorEnum {
    return document.body.style.cursor as CursorEnum;
  }
  /* #endregion dom */

  /* #region ng */

  ngOnInit(): void {
    this.readSignals();
    this.destroyFilter();
    this.drawCalendarGanttService.pixelRatio = DrawHelper.pixelRatio();

    this.drawRowHeader.filterImage = DrawHelper.createImage(
      new Size(this.drawRowHeader.iconSize, this.drawRowHeader.iconSize),
      'assets/svg/sorting.svg'
    );

    this.drawRowHeader.createCanvas();
  }

  ngAfterViewInit(): void {
    this.gridColorService.readData();
    this.gridFontsService.readData();

    this.initializeDrawRowHeader();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['valueChangeVScrollbar']) {
      const currentValue = changes['valueChangeVScrollbar'].currentValue;
      const previousValue = changes['valueChangeVScrollbar'].previousValue;
      const diff = currentValue - previousValue;

      if (diff) {
        setTimeout(() => this.drawRowHeader.moveRow(diff), 50);
      }
    }
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();

    this.effects.forEach((effectRef) => {
      if (effectRef) {
        effectRef.destroy();
      }
    });
    this.effects = [];

    this.drawRowHeader.deleteCanvas();
  }

  private initializeDrawRowHeader(): void {
    const box = this.boxCalendarRowHeader.nativeElement;
    this.drawRowHeader.height = box.clientHeight;
    this.drawRowHeader.width = box.clientWidth;
    this.drawRowHeader.createCanvas();
  }

  /* #endregion ng */

  /* #region resize+visibility */
  onResize(entries: ResizeObserverEntry[]): void {
    if (entries && entries.length > 0) {
      const entry = entries[0];
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.updateDrawRowHeaderDimensions(entry.target as HTMLElement);
          this.checkPixelRatio();
          this.redrawComponents();
        });
      });
    }
  }

  private checkPixelRatio(): void {
    const pixelRatio = DrawHelper.pixelRatio();
    if (this.drawCalendarGanttService.pixelRatio !== pixelRatio) {
      this.drawRowHeader.deleteCanvas();
      this.drawRowHeader.createCanvas();
      this.drawCalendarGanttService.pixelRatio = pixelRatio;
    }
  }

  isCanvasAvailable(): boolean {
    return this.drawRowHeader.isCanvasAvailable();
  }
  @CanvasAvailable()
  private redrawComponents(): void {
    this.drawRowHeader.createRuler();
    this.drawRowHeader.renderRowHeader();
    this.drawRowHeader.drawCalendar();
  }

  private updateDrawRowHeaderDimensions(element: HTMLElement): void {
    this.drawRowHeader.height = element.clientHeight;
    this.drawRowHeader.width = element.clientWidth;
  }

  /* #endregion resize+visibility */

  /* #region   mouse event */

  private getMousePos(event: MouseEvent) {
    if (!this.drawRowHeader.rowHeaderCanvasManager.canvas) return;

    const rect =
      this.drawRowHeader.rowHeaderCanvasManager.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  onMouseMove(event: MouseEvent) {
    const pos = this.getMousePos(event);
    if (!pos) return;

    if (this.drawRowHeader.recFilterIcon) {
      if (this.drawRowHeader.recFilterIcon.pointInRect(pos.x, pos.y)) {
        this.currentCursor = CursorEnum.pointer;
      } else {
        this.currentCursor = CursorEnum.default;
      }
    }
  }

  onClick(event: MouseEvent) {
    const pos = this.getMousePos(event);
    if (!pos) return;
    if (this.drawRowHeader.recFilterIcon) {
      if (this.drawRowHeader.recFilterIcon.pointInRect(pos.x, pos.y)) {
        this.showFilter();
      }
    }
  }

  onMouseLeave() {
    this.destroyFilter();
  }

  /* #endregion   mouse event */

  /* #region Filter */

  showFilter() {
    const width = 150;
    const canvas = this.drawRowHeader.rowHeaderCanvasManager.canvas;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    let leftPos =
      this.drawRowHeader.recFilterIcon.left +
      rect.left +
      this.drawRowHeader.recFilterIcon.width -
      width;

    const diff = leftPos - rect.left;
    if (diff < 0) {
      leftPos -= diff;
    }

    this.filterStyle = {
      width: width + 'px',
      visibility: 'visible',
      left: leftPos + 'px',
      top:
        this.drawRowHeader.recFilterIcon.top +
        this.drawRowHeader.recFilterIcon.height +
        rect.top +
        'px',
    };
  }

  destroyFilter() {
    this.filterStyle = {
      visibility: 'hidden',
    };
  }

  /* #endregion Filter */

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      const effect1 = effect(() => {
        const isRead = this.dataManagementBreak.isRead();
        if (isRead) {
          if (!this.drawRowHeader.isCanvasAvailable()) {
            return;
          }

          this.drawRowHeader.createRuler();
          this.drawRowHeader.renderRowHeader();
          this.drawRowHeader.drawCalendar();
        }
      });
      this.effects.push(effect1);

      const effect2 = effect(() => {
        const isReset = this.gridColorService.isReset();
        if (isReset) {
          this.onResize([]);
          this.gridColorService.isReset.set(false);
        }
      });
      this.effects.push(effect2);

      const effect3 = effect(() => {
        const isReset = this.gridFontsService.isReset();
        if (isReset) {
          this.onResize([]);
          this.gridFontsService.isReset.set(false); // Hier war ein Fehler - sollte gridFontsService sein, nicht gridColorService
        }
      });
      this.effects.push(effect3);
    });
  }
}

import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Size } from 'src/app/grid/classes/geometry';
import { GridColorService } from 'src/app/grid/services/grid-color.service';
import { GridFontsService } from 'src/app/grid/services/grid-fonts.service';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { ScrollService } from 'src/app/workplace/absence-gantt/services/scroll.service';
import { DataManagementBreakService } from 'src/app/data/management/data-management-break.service';
import { AbsenceGanttFilterComponent } from './absence-gantt-filter/absence-gantt-filter.component';
import { Subject, takeUntil } from 'rxjs';
import { DrawCalendarGanttService } from 'src/app/workplace/absence-gantt/services/draw-calendar-gantt.service';
import { CursorEnum } from 'src/app/grid/enums/cursor_enums';
import { DrawRowHeaderService } from '../services/draw-row-header.service';
import { CanvasAvailable } from 'src/app/services/canvasAvailable.decorator';

@Component({
  selector: 'app-absence-gantt-row-header',
  templateUrl: './absence-gantt-row-header.component.html',
  styleUrls: ['./absence-gantt-row-header.component.scss'],
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

  private ngUnsubscribe: Subject<void> = new Subject<void>();

  filterStyle: any = {};

  constructor(
    public scroll: ScrollService,
    private gridColorService: GridColorService,
    private gridFontsService: GridFontsService,
    private dataManagementBreak: DataManagementBreakService,
    private drawCalendarGanttService: DrawCalendarGanttService,
    private drawRowHeader: DrawRowHeaderService
  ) {}

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
    this.destroyFilter();
    this.drawCalendarGanttService.pixelRatio = DrawHelper.pixelRatio();

    this.drawRowHeader.filterImage = DrawHelper.createImage(
      new Size(this.drawRowHeader.iconSize, this.drawRowHeader.iconSize),
      'assets/svg/filter.svg'
    );

    this.drawRowHeader.createCanvas();

    this.dataManagementBreak.isRead
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        if (!this.drawRowHeader.isCanvasAvailable()) {
          return;
        }

        this.drawRowHeader.createRuler();
        this.drawRowHeader.renderRowHeader();
        this.drawRowHeader.drawCalendar();
      });
  }

  ngAfterViewInit(): void {
    this.gridColorService.isReset
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => this.onResize([]));
    this.gridFontsService.isReset
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => this.onResize([]));
    this.gridColorService.readData();
    this.gridFontsService.readData();

    this.initializeDrawRowHeader();

    this.scroll.moveVerticalEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x: number) => {
        this.drawRowHeader.moveRow(x);
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['valueChangeVScrollbar']) {
      this.drawRowHeader.moveRow(changes['valueChangeVScrollbar'].currentValue);
    }
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();

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
      this.updateDrawRowHeaderDimensions(entry.target as HTMLElement);
      this.checkPixelRatio();
      this.redrawComponents();
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

    if (this.drawRowHeader.recFilterIcon.pointInRect(pos.x, pos.y)) {
      this.currentCursor = CursorEnum.pointer;
    } else {
      this.currentCursor = CursorEnum.default;
    }
  }

  onClick(event: MouseEvent) {
    const pos = this.getMousePos(event);
    if (!pos) return;

    if (this.drawRowHeader.recFilterIcon.pointInRect(pos.x, pos.y)) {
      this.showFilter();
    }
  }

  onMouseLeave(event: MouseEvent) {
    this.destroyFilter();
  }

  /* #endregion   mouse event */

  /* #region Filter */

  showFilter() {
    const width = 300;
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
}

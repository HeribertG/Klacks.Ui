import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  Renderer2,
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

@Component({
  selector: 'app-absence-gantt-row-header',
  templateUrl: './absence-gantt-row-header.component.html',
  styleUrls: ['./absence-gantt-row-header.component.scss'],
})
export class AbsenceGanttRowHeaderComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('ganttFilter', { static: false }) filter:
    | AbsenceGanttFilterComponent
    | undefined;

  private resizeObserver: ResizeObserver | undefined;
  private resizeSubject: Subject<void> = new Subject<void>();
  private ngUnsubscribe: Subject<void> = new Subject<void>();
  resizeWindow: (() => void) | undefined;
  visibilitychangeWindow: (() => void) | undefined;

  private box: HTMLDivElement | undefined;

  filterStyle: any = {};

  private eventListeners: Array<() => void> = [];

  constructor(
    public scroll: ScrollService,
    private renderer: Renderer2,
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

    this.eventListeners.push(
      this.renderer.listen('window', 'resize', this.resize.bind(this))
    );
    this.eventListeners.push(
      this.renderer.listen('window', 'visibilitychange', this.resize.bind(this))
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
    this.box = document.getElementById(
      'box-calendar-row-header'
    ) as HTMLDivElement;

    this.resizeObserver = new ResizeObserver(() => {
      this.resizeSubject.next();
    });
    this.resizeObserver.observe(this.box);

    this.resizeSubject.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
      this.resize();
    });

    this.gridColorService.isReset
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => this.resize());
    this.gridFontsService.isReset
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => this.resize());
    this.gridColorService.readData();
    this.gridFontsService.readData();

    this.drawRowHeader.height = this.box!.clientHeight;
    this.drawRowHeader.width = this.box!.clientWidth;
    this.drawRowHeader.createCanvas();

    this.scroll.moveVerticalEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x: number) => {
        this.drawRowHeader.moveRow(x);
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();

    this.eventListeners.forEach((fn) => fn());
    this.eventListeners = [];

    this.drawRowHeader.deleteCanvas();
  }

  /* #endregion ng */

  /* #region resize+visibility */
  private resize = (): void => {
    if (!this.drawRowHeader.isCanvasAvailable()) {
      return;
    }

    this.drawRowHeader.height = this.box!.clientHeight;
    this.drawRowHeader.width = this.box!.clientWidth;
    const pixelRatio = DrawHelper.pixelRatio();
    if (this.drawCalendarGanttService.pixelRatio !== pixelRatio) {
      this.drawRowHeader.deleteCanvas();
      this.drawRowHeader.createCanvas();
      this.drawCalendarGanttService.pixelRatio = pixelRatio;
    }

    this.drawRowHeader.createRuler();
    this.drawRowHeader.renderRowHeader();
    this.drawRowHeader.drawCalendar();
  };

  /* #endregion resize+visibility */

  /* #region   mouse event */

  onMouseMove(event: MouseEvent) {
    if (
      this.drawRowHeader.recFilterIcon.pointInRect(
        event.clientX - this.drawRowHeader.rowHeaderCanvas!.offsetLeft,
        event.clientY - this.drawRowHeader.rowHeaderCanvas!.offsetTop
      )
    ) {
      this.currentCursor = CursorEnum.pointer;
    } else {
      this.currentCursor = CursorEnum.default;
    }
  }

  onClick(event: MouseEvent) {
    if (
      this.drawRowHeader.recFilterIcon.pointInRect(
        event.clientX - this.drawRowHeader.rowHeaderCanvas!.offsetLeft,
        event.clientY - this.drawRowHeader.rowHeaderCanvas!.offsetTop
      )
    ) {
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
    let leftPos =
      this.drawRowHeader.recFilterIcon.left +
      this.drawRowHeader.rowHeaderCanvas!.offsetLeft +
      this.drawRowHeader.recFilterIcon.width -
      width;

    const diff = leftPos - this.drawRowHeader.rowHeaderCanvas!.offsetLeft;
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
        this.drawRowHeader.rowHeaderCanvas!.offsetTop +
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

import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { ContextMenuComponent } from 'src/app/shared/context-menu/context-menu.component';
import { SpinnerService } from 'src/app/spinner/spinner.service';
import { ScheduleHScrollbarComponent } from '../schedule-h-scrollbar/schedule-h-scrollbar.component';
import { ScheduleVScrollbarComponent } from '../schedule-v-scrollbar/schedule-v-scrollbar.component';
import { SelectedArea } from 'src/app/grid/enums/breaks_enums';
import { Subject, takeUntil } from 'rxjs';
import { ScrollService } from '../services/scroll.service';
import { DrawScheduleService } from '../services/draw-schedule.service';
import { DataService } from '../services/data.service';
import { ScheduleScheduleRowHeaderComponent } from '../schedule-schedule-row-header/schedule-schedule-row-header.component';
import { DataManagementScheduleService } from 'src/app/data/management/data-management-schedule.service';
import { SettingsService } from '../services/settings.service';

@Component({
  selector: 'app-schedule-schedule-surface',
  templateUrl: './schedule-schedule-surface.component.html',
  styleUrls: ['./schedule-schedule-surface.component.scss'],
  providers: [DrawScheduleService],
})
export class ScheduleScheduleSurfaceComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Input() contextMenu: ContextMenuComponent | undefined;
  @Input() rowHeader: ScheduleScheduleRowHeaderComponent | undefined;
  @Input() vScrollbar: ScheduleVScrollbarComponent | undefined;
  @Input() hScrollbar: ScheduleHScrollbarComponent | undefined;
  @ViewChild('boxSchedule') boxSchedule!: ElementRef<HTMLDivElement>;

  public selectedArea: SelectedArea = SelectedArea.None;
  public isLeftMouseDown = false;

  private tooltip: HTMLDivElement | undefined;
  private _pixelRatio = 1;

  private ngUnsubscribe = new Subject<void>();

  constructor(
    public dataManagementSchedule: DataManagementScheduleService,
    public dataService: DataService,
    public scroll: ScrollService,
    public drawSchedule: DrawScheduleService,
    private el: ElementRef,
    private spinnerService: SpinnerService,
    private settings: SettingsService,
    private cdr: ChangeDetectorRef
  ) {}

  /* #region ng */
  ngOnInit(): void {
    this.spinnerService.showProgressSpinner = false;
    this._pixelRatio = DrawHelper.pixelRatio();

    this.drawSchedule.refresh();

    this.tooltip = document.getElementById('tooltip') as HTMLDivElement;
  }

  ngAfterViewInit(): void {
    this.drawSchedule.createCanvas();
    this.initializeDrawSchedule();

    this.dataManagementSchedule.isRead
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(
        () => {
          this.dataService.setMetrics();
        },
        (error) => {
          console.error('Error loading the data:', error);
        }
      );

    this.tooltip = document.getElementById('tooltip') as HTMLDivElement;

    if (this.vScrollbar) {
      this.drawSchedule.vScrollbar = this.vScrollbar;
    }
    if (this.hScrollbar) {
      this.drawSchedule.hScrollbar = this.hScrollbar;
    }

    if (this.rowHeader) {
      this.drawSchedule.rowHeader = this.rowHeader;
    }

    this.dataService.refreshEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.spinnerService.showProgressSpinner = false;
        this.drawSchedule.redraw();
      });

    this.settings.zoomChangingEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.drawSchedule.createCanvas();
        this.drawSchedule.rebuild();
        this.drawSchedule.redraw();
      });

    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();

    this.drawSchedule.deleteCanvas();
    this.drawSchedule.vScrollbar = undefined;
    this.drawSchedule.hScrollbar = undefined;
    this.drawSchedule.rowHeader = undefined;
  }

  /* #endregion ng */

  /* #region   resize+visibility */

  private initializeDrawSchedule(): void {
    this.drawSchedule.createCanvas();
    const box = this.boxSchedule.nativeElement;
    this.drawSchedule.width = box.clientWidth;
    this.drawSchedule.height = box.clientHeight;
    this.drawSchedule.refresh();
  }

  setFocus(): void {
    const x = this.el.nativeElement as HTMLDivElement;
    if (x) {
      x.focus();
      this.drawSchedule.isFocused = true;
    }
  }

  onResize(entries: ResizeObserverEntry[]): void {
    if (entries && entries.length > 0) {
      const entry = entries[0];
      this.updateDrawScheduleDimensions(entry.target as Element);
      this.checkPixelRatio();
      this.resizeScrollbars();
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

  private resizeScrollbars(): void {
    if (this.vScrollbar) {
      this.vScrollbar.resize();
    }
    if (this.hScrollbar) {
      this.hScrollbar.resize();
    }
  }

  /* #endregion   resize+visibility */

  /* #region   render */

  /**
   * Moves the table by the specified number of units in the X and Y directions.
   *
   * @param directionX - number of steps in X direction (must be a valid number)
   * @param directionY - number of steps in Y direction (must be a valid number)
   */
  moveGrid(directionX: number, directionY: number): void {
    this.drawSchedule.moveGrid(directionX, directionY);
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
}

import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  EffectRef,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  effect,
} from '@angular/core';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { ContextMenuComponent } from 'src/app/shared/context-menu/context-menu.component';
import { SelectedArea } from 'src/app/grid/enums/breaks_enums';
import { Subject, takeUntil } from 'rxjs';
import { DrawScheduleService } from '../services/draw-schedule.service';
import { DataService } from '../services/data.service';
import { ScheduleScheduleRowHeaderComponent } from '../schedule-schedule-row-header/schedule-schedule-row-header.component';
import { DataManagementScheduleService } from 'src/app/data/management/data-management-schedule.service';
import { SettingsService } from '../services/settings.service';
import { CommonModule } from '@angular/common';
import { ResizeDirective } from 'src/app/directives/resize.directive';
import { SharedModule } from 'src/app/shared/shared.module';
import { CanvasManagerService } from '../services/canvas-manager.service';
import { CellManipulationService } from '../services/cell-manipulation.service';
import { CellRenderService } from '../services/cell-render.service';
import { CreateCellService } from '../services/create-cell.service';
import { CreateHeaderService } from '../services/create-header.service';
import { DrawRowHeaderService } from '../services/draw-row-header.service';
import { CreateRowHeaderService } from '../services/create-row-header.service';
import { GridRenderService } from '../services/grid-render.service';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';

@Component({
  selector: 'app-schedule-schedule-surface',
  templateUrl: './schedule-schedule-surface.component.html',
  styleUrls: ['./schedule-schedule-surface.component.scss'],
  standalone: true,
  imports: [CommonModule, ContextMenuComponent, ResizeDirective, SharedModule],
  providers: [
    DataService,
    ScrollService,
    SettingsService,
    CanvasManagerService,
    CellManipulationService,
    CellRenderService,
    CreateCellService,
    CreateHeaderService,
    CreateRowHeaderService,
    DrawRowHeaderService,
    DrawScheduleService,
    GridRenderService,
  ],
})
export class ScheduleScheduleSurfaceComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Input() contextMenu: ContextMenuComponent | undefined;
  @Input() rowHeader: ScheduleScheduleRowHeaderComponent | undefined;
  @Input() valueChangeHScrollbar!: number;
  @Input() valueChangeVScrollbar!: number;

  @Output() valueHScrollbar = new EventEmitter<number>();
  @Output() maxValueHScrollbar = new EventEmitter<number>();
  @Output() visibleValueHScrollbar = new EventEmitter<number>();
  @Output() valueVScrollbar = new EventEmitter<number>();
  @Output() maxValueVScrollbar = new EventEmitter<number>();
  @Output() visibleValueVScrollbar = new EventEmitter<number>();
  @ViewChild('boxSchedule') boxSchedule!: ElementRef<HTMLDivElement>;

  public selectedArea: SelectedArea = SelectedArea.None;
  public isLeftMouseDown = false;

  private tooltip: HTMLDivElement | undefined;
  private _pixelRatio = 1;

  private ngUnsubscribe = new Subject<void>();
  private effects: EffectRef[] = [];

  constructor(
    public dataManagementSchedule: DataManagementScheduleService,
    public dataService: DataService,
    public scroll: ScrollService,
    public drawSchedule: DrawScheduleService,
    private el: ElementRef,
    private settings: SettingsService,
    private cdr: ChangeDetectorRef
  ) {
    this.readSignals();
  }

  /* #region ng */
  ngOnInit(): void {
    this._pixelRatio = DrawHelper.pixelRatio();

    this.drawSchedule.refresh();

    this.tooltip = document.getElementById('tooltip') as HTMLDivElement;
  }

  ngAfterViewInit(): void {
    this.drawSchedule.createCanvas();
    this.initializeDrawSchedule();

    this.tooltip = document.getElementById('tooltip') as HTMLDivElement;

    if (this.rowHeader) {
      this.drawSchedule.rowHeader = this.rowHeader;
    }

    this.dataService.refreshEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
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
    this.drawSchedule.rowHeader = undefined;

    this.effects.forEach((effectRef) => {
      if (effectRef) {
        effectRef.destroy();
      }
    });
    this.effects = [];
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
      this.updateDrawScheduleDimensions(entry.target as HTMLElement);
      this.checkPixelRatio();
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    const dataReadEffect = effect(() => {
      if (this.dataManagementSchedule.isRead()) {
        this.dataService.setMetrics();
      }
    });
    this.effects.push(dataReadEffect);
  }
}

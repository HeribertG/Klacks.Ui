import {
  AfterViewInit,
  Component,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
} from '@angular/core';
import { DataService } from '../services/data.service';
import { DrawRowHeaderService } from '../services/draw-row-header.service';
import { Subject, takeUntil } from 'rxjs';
import { SettingsService } from '../services/settings.service';
import { CommonModule } from '@angular/common';
import { ResizeDirective } from 'src/app/directives/resize.directive';
import { CanvasManagerService } from '../services/canvas-manager.service';
import { CellRenderService } from '../services/cell-render.service';
import { CellManipulationService } from '../services/cell-manipulation.service';
import { CreateCellService } from '../services/create-cell.service';
import { CreateRowHeaderService } from '../services/create-row-header.service';
import { CreateHeaderService } from '../services/create-header.service';
import { GridRenderService } from '../services/grid-render.service';
import { DrawScheduleService } from '../services/draw-schedule.service';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';

@Component({
  selector: 'app-schedule-schedule-row-header',
  templateUrl: './schedule-schedule-row-header.component.html',
  styleUrls: ['./schedule-schedule-row-header.component.scss'],
  standalone: true,
  imports: [CommonModule, ResizeDirective],
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
export class ScheduleScheduleRowHeaderComponent
  implements AfterViewInit, OnDestroy
{
  @ViewChild('box') boxElement!: ElementRef<HTMLDivElement>;

  public dataService = inject(DataService);
  public scroll = inject(ScrollService);
  public drawRowHeader = inject(DrawRowHeaderService);
  private settings = inject(SettingsService);

  private ngUnsubscribe = new Subject<void>();

  ngAfterViewInit(): void {
    this.initializeDrawRowHeader();
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this.drawRowHeader.deleteCanvas();
  }

  onResize(entries: ResizeObserverEntry[]): void {
    if (entries && entries.length > 0) {
      const entry = entries[0];
      this.updateDrawRowHeaderDimensions(entry.target as HTMLElement);
      this.drawRowHeader.refresh();
    }
  }

  private initializeDrawRowHeader(): void {
    this.updateDrawRowHeaderDimensions();
    this.drawRowHeader.createCanvas();
  }

  private updateDrawRowHeaderDimensions(element?: Element): void {
    const box = element || this.boxElement.nativeElement;
    this.drawRowHeader.width = box.clientWidth;
    this.drawRowHeader.height = box.clientHeight;
  }

  private setupEventListeners(): void {
    this.dataService.refreshEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.drawRowHeader.redraw();
      });

    this.settings.zoomChangingEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.drawRowHeader.createCanvas();
        this.drawRowHeader.rebuild();
        this.drawRowHeader.redraw();
      });
  }
}

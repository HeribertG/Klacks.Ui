import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { DataService } from '../services/data.service';
import { ScrollService } from '../services/scroll.service';
import { DrawRowHeaderService } from '../services/draw-row-header.service';
import { Subject, takeUntil } from 'rxjs';
import { SettingsService } from '../services/settings.service';

@Component({
  selector: 'app-schedule-schedule-row-header',
  templateUrl: './schedule-schedule-row-header.component.html',
  styleUrls: ['./schedule-schedule-row-header.component.scss'],
})
export class ScheduleScheduleRowHeaderComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('box') boxElement!: ElementRef<HTMLDivElement>;

  private ngUnsubscribe = new Subject<void>();

  constructor(
    public dataService: DataService,
    public scroll: ScrollService,
    public drawRowHeader: DrawRowHeaderService,
    private settings: SettingsService
  ) {}

  ngOnInit(): void {}

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
      this.updateDrawRowHeaderDimensions(entry.target as Element);
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

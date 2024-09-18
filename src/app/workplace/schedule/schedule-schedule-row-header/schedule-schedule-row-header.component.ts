import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  Renderer2,
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
  resizeWindow: (() => void) | undefined;
  visibilitychangeWindow: (() => void) | undefined;

  private eventListeners: Array<() => void> = [];
  private box: HTMLDivElement | undefined;

  private ngUnsubscribe = new Subject<void>();

  constructor(
    public dataService: DataService,
    public scroll: ScrollService,
    public drawRowHeader: DrawRowHeaderService,
    private renderer: Renderer2,
    private settings: SettingsService
  ) {}

  /* #region ng */
  ngOnInit(): void {
    this.eventListeners.push(
      this.renderer.listen('window', 'resize', this.resize.bind(this))
    );
    this.eventListeners.push(
      this.renderer.listen('window', 'visibilitychange', this.resize.bind(this))
    );
  }
  ngAfterViewInit(): void {
    this.box = document.getElementById('box') as HTMLDivElement;
    this.drawRowHeader.width = this.box.clientWidth;
    this.drawRowHeader.height = this.box.clientHeight;
    this.drawRowHeader.createCanvas();

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

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();

    this.eventListeners.forEach((fn) => fn());
    this.eventListeners = [];
    this.drawRowHeader.deleteCanvas();
  }
  /* #endregion ng */

  /* #region resize+visibility */
  private resize = (event: any): void => {
    this.onResize();
  };
  onResize() {
    this.drawRowHeader.width = this.box!.clientWidth;
    this.drawRowHeader.height = this.box!.clientHeight;

    this.drawRowHeader.refresh();
  }
  /* #endregion resize+visibility */
}

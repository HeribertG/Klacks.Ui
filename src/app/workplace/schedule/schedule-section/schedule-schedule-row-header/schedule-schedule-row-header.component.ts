import {
  AfterViewInit,
  Component,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
  Input,
  OnChanges,
  SimpleChanges,
  effect,
  EffectRef,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ScrollEventService } from 'src/app/shared/scrollbar/scroll-event.service';
import { CommonModule } from '@angular/common';
import { ResizeDirective } from 'src/app/directives/resize.directive';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';

import { BaseCreateRowHeaderService } from 'src/app/workplace/schedule/services/create-row-header.service';
import { BaseDrawRowHeaderService } from 'src/app/workplace/schedule/services/draw-row-header.service';
import { BaseDataService } from 'src/app/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/shared/grid/services/data-setting/settings.service';

@Component({
  selector: 'app-schedule-schedule-row-header',
  templateUrl: './schedule-schedule-row-header.component.html',
  styleUrls: ['./schedule-schedule-row-header.component.scss'],
  standalone: true,
  imports: [CommonModule, ResizeDirective],
  providers: [ScrollService, BaseCreateRowHeaderService],
})
export class ScheduleScheduleRowHeaderComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('box') boxElement!: ElementRef<HTMLDivElement>;

  @Input() valueChangeVScrollbar!: number;

  public dataService = inject(BaseDataService);
  public scroll = inject(ScrollService);
  public drawRowHeader = inject(BaseDrawRowHeaderService);
  private injector = inject(Injector);
  private settings = inject(BaseSettingsService);
  private scrollEventService = inject(ScrollEventService);

  private ngUnsubscribe = new Subject<void>();
  private effects: EffectRef[] = [];

  ngAfterViewInit(): void {
    this.initializeDrawRowHeader();
    this.readSignals();
    this.subscribeToScrollEvents(); // Back to Observable solution
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this.drawRowHeader.deleteCanvas();

    this.effects.forEach((effectRef) => {
      if (effectRef) {
        effectRef.destroy();
      }
    });
    this.effects = [];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['valueChangeHScrollbar']) {
      const prevH = changes['valueChangeHScrollbar'].previousValue;
      const currH = changes['valueChangeHScrollbar'].currentValue;

      if (currH !== prevH) {
        this.scroll.horizontalScrollPosition = currH;
      }
    }

    if (changes['valueChangeVScrollbar']) {
      const prevV = changes['valueChangeVScrollbar'].previousValue;
      const currV = changes['valueChangeVScrollbar'].currentValue;
      if (currV !== prevV) {
        this.scroll.verticalScrollPosition = currV;
      }
    }
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

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      const zoomEffect = effect(() => {
        this.settings.zoomSignal();
        setTimeout(() => {
          if (this.drawRowHeader.isCanvasAvailable()) {
            this.drawRowHeader.createCanvas();
            this.drawRowHeader.rebuild();
            this.drawRowHeader.redraw();
          }
        }, 0);
      });
      this.effects.push(zoomEffect);

      const refreshEffect = effect(() => {
        this.dataService.refreshSignal();
        this.drawRowHeader.redraw();
      });
      this.effects.push(refreshEffect);

      const positionEffect = effect(() => {
        this.drawRowHeader.cellManipulation.positionSignal();
        if (this.drawRowHeader.isCanvasAvailable()) {
          this.drawRowHeader.drawRowHeaderSelection();
        }
      });
      this.effects.push(positionEffect);
    });
  }

  private subscribeToScrollEvents(): void {
    this.scrollEventService.scroll$
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        if (this.drawRowHeader.isCanvasAvailable()) {
          this.drawRowHeader.moveGrid();
        }
      });
  }
}

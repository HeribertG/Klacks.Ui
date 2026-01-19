import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
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
import { NgStyle } from '@angular/common';
import { Subject } from 'rxjs';
import { ScrollEventService } from 'src/app/presentation/shared/scrollbar/scroll-event.service';

import { ResizeDirective } from 'src/app/presentation/directives/resize.directive';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';

import { BaseCreateRowHeaderService } from 'src/app/presentation/workplace/schedule/schedule-section/services/create-row-header.service';
import { BaseDrawRowHeaderService } from 'src/app/presentation/workplace/schedule/schedule-section/services/draw-row-header.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ScheduleRowHeaderEventsDirective } from './directives/schedule-row-header-events.directive';
import { ClientFilterComponent } from 'src/app/presentation/shared/client-filter/client-filter.component';
import { Size } from 'src/app/shared/helpers/geometry.helper';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { CursorEnum } from 'src/app/presentation/shared/grid/enums/cursor_enums';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ProgressBarAnimationService } from 'src/app/presentation/shared/grid/services/progress-bar-animation.service';

@Component({
  selector: 'app-schedule-schedule-row-header',
  templateUrl: './schedule-schedule-row-header.component.html',
  styleUrls: ['./schedule-schedule-row-header.component.scss'],
  standalone: true,
  imports: [NgStyle, ResizeDirective, ScheduleRowHeaderEventsDirective, ClientFilterComponent],
  providers: [ScrollService, BaseCreateRowHeaderService, ProgressBarAnimationService],
})
export class ScheduleScheduleRowHeaderComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('box') boxElement!: ElementRef<HTMLDivElement>;

  @Input() valueChangeVScrollbar!: number;

  public dataService = inject(BaseDataService);
  public scroll = inject(ScrollService);
  public drawRowHeader = inject(BaseDrawRowHeaderService);
  public dataManagementSchedule = inject(DataManagementScheduleService);
  private injector = inject(Injector);
  private settings = inject(BaseSettingsService);
  private scrollEventService = inject(ScrollEventService);

  private ngUnsubscribe = new Subject<void>();
  private effects: EffectRef[] = [];

  filterStyle: Record<string, string> = { visibility: 'hidden' };
  private iconSize = 16;

  private set currentCursor(cursor: CursorEnum) {
    document.body.style.cursor = cursor;
  }

  ngOnInit(): void {
    this.destroyFilter();
    this.drawRowHeader.filterImage = DrawHelper.createImage(
      new Size(this.iconSize, this.iconSize),
      'assets/svg/sorting.svg'
    );
  }

  ngAfterViewInit(): void {
    this.initializeDrawRowHeader();
    this.readSignals();
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

      const dataReadEffect = effect(() => {
        const readState = this.dataManagementSchedule.isRead();
        if (readState.value) {
          this.drawRowHeader.redraw();
        }
      });
      this.effects.push(dataReadEffect);

      const positionEffect = effect(() => {
        this.drawRowHeader.cellManipulation.positionSignal();
        if (this.drawRowHeader.isCanvasAvailable()) {
          this.drawRowHeader.drawRowHeaderSelection();
        }
      });
      this.effects.push(positionEffect);

      const scrollEffect = effect(() => {
        this.scrollEventService.scrollPosition();
        if (this.drawRowHeader.isCanvasAvailable()) {
          this.drawRowHeader.moveGrid();
        }
      });
      this.effects.push(scrollEffect);
    });
  }

  private getMousePos(event: MouseEvent): { x: number; y: number } | undefined {
    if (!this.drawRowHeader.canvas) return undefined;

    const rect = this.drawRowHeader.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  onMouseMove(event: MouseEvent): void {
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

  onCanvasClick(event: MouseEvent): void {
    const pos = this.getMousePos(event);
    if (!pos) return;

    if (this.drawRowHeader.recFilterIcon) {
      if (this.drawRowHeader.recFilterIcon.pointInRect(pos.x, pos.y)) {
        this.showFilter();
      }
    }
  }

  onFilterMouseLeave(): void {
    this.destroyFilter();
  }

  onFilterChange(): void {
    this.dataManagementSchedule.readWorkSchedule(false);
  }

  private showFilter(): void {
    const canvas = this.drawRowHeader.canvas;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    const leftPos = rect.left;

    this.filterStyle = {
      visibility: 'visible',
      left: leftPos + 'px',
      top:
        this.drawRowHeader.recFilterIcon.top +
        this.drawRowHeader.recFilterIcon.height +
        rect.top +
        'px',
    };
  }

  private destroyFilter(): void {
    this.filterStyle = {
      visibility: 'hidden',
    };
  }
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Stand-alone row header for the timeline view.
 * Shares the shared draw engine with the tabular view but swaps in the
 * timeline-specific create-row-header service so the cell gets a 24h ruler
 * appended on the right. Intentionally lean: no filter / context menu / tooltip
 * logic - that belongs to the tabular row header, not the timeline one.
 * @param drawRowHeader - Reused draw engine (BaseDrawRowHeaderService)
 * @param settings - Grid settings (cell height, zoom, timeline flag)
 * @param valueChangeVScrollbar - Vertical scroll position pushed in by the parent
 */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EffectRef,
  ElementRef,
  inject,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  effect,
  runInInjectionContext,
} from '@angular/core';
import { ResizeDirective } from 'src/app/presentation/directives/resize.directive';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { ScrollEventService } from 'src/app/presentation/shared/scrollbar/scroll-event.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseCreateRowHeaderService } from '../../services/create-row-header.service';
import { BaseDrawRowHeaderService } from '../../services/draw-row-header.service';
import { ProgressBarAnimationService } from 'src/app/presentation/shared/grid/services/progress-bar-animation.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { WorkScheduleLoaderService } from 'src/app/domain/services/schedule/work-schedule-loader.service';
import { RowHeaderIconsService } from 'src/app/presentation/shared/grid/services/row-header-icons.service';
import { TimelineCreateRowHeaderService } from '../services/timeline-create-row-header.service';

@Component({
  selector: 'app-schedule-timeline-row-header',
  templateUrl: './schedule-timeline-row-header.component.html',
  styleUrls: ['./schedule-timeline-row-header.component.scss'],
  standalone: true,
  imports: [ResizeDirective],
  providers: [
    { provide: BaseCreateRowHeaderService, useClass: TimelineCreateRowHeaderService },
    BaseDrawRowHeaderService,
    ProgressBarAnimationService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleTimelineRowHeaderComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('box') boxElement!: ElementRef<HTMLDivElement>;
  @Input() valueChangeVScrollbar!: number;

  public dataService = inject(BaseDataService);
  public scroll = inject(ScrollService);
  public drawRowHeader = inject(BaseDrawRowHeaderService);
  public dataManagementSchedule = inject(DataManagementScheduleService);
  private workScheduleLoader = inject(WorkScheduleLoaderService);
  private injector = inject(Injector);
  private settings = inject(BaseSettingsService);
  private scrollEventService = inject(ScrollEventService);
  private rowHeaderIcons = inject(RowHeaderIconsService);
  private cdr = inject(ChangeDetectorRef);

  private effects: EffectRef[] = [];
  private isDestroyed = false;
  private pixelRatio = 1;

  ngOnInit(): void {
    this.drawRowHeader.filterImage = this.rowHeaderIcons.sortingPicto;
    this.pixelRatio = DrawHelper.pixelRatio();
  }

  ngAfterViewInit(): void {
    this.initializeDrawRowHeader();
    this.registerSignalEffects();
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.drawRowHeader.deleteCanvas();
    this.effects.forEach((e) => e?.destroy());
    this.effects = [];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['valueChangeVScrollbar']) {
      this.scroll.verticalScrollPosition =
        changes['valueChangeVScrollbar'].currentValue;
    }
  }

  onResize(entries: ResizeObserverEntry[]): void {
    if (entries && entries.length > 0) {
      this.updateDrawRowHeaderDimensions(entries[0].target as HTMLElement);
      this.drawRowHeader.refresh();
      this.checkPixelRatio();
    }
  }

  private checkPixelRatio(): void {
    const current = DrawHelper.pixelRatio();
    if (this.pixelRatio !== current && this.drawRowHeader.isCanvasAvailable()) {
      this.pixelRatio = current;
      this.drawRowHeader.createCanvas();
      this.drawRowHeader.rebuild();
      this.drawRowHeader.redraw();
    }
  }

  private initializeDrawRowHeader(): void {
    this.updateDrawRowHeaderDimensions();
    this.drawRowHeader.createCanvas();
  }

  private updateDrawRowHeaderDimensions(element?: Element): void {
    const box = element ?? this.boxElement.nativeElement;
    this.drawRowHeader.width = box.clientWidth;
    this.drawRowHeader.height = box.clientHeight;
  }

  private registerSignalEffects(): void {
    runInInjectionContext(this.injector, () => {
      this.effects.push(
        effect(() => {
          this.settings.zoomSignal();
          setTimeout(() => {
            if (this.isDestroyed) return;
            if (this.drawRowHeader.isCanvasAvailable()) {
              this.drawRowHeader.createCanvas();
              this.drawRowHeader.rebuild();
              this.drawRowHeader.redraw();
            }
          }, 0);
        }),
      );

      this.effects.push(
        effect(() => {
          this.dataService.refreshSignal();
          if (this.drawRowHeader.isCanvasAvailable()) {
            this.drawRowHeader.redraw();
          }
        }),
      );

      this.effects.push(
        effect(() => {
          this.scrollEventService.scrollPosition();
          if (this.drawRowHeader.isCanvasAvailable()) {
            this.drawRowHeader.moveGrid();
          }
        }),
      );

      this.effects.push(
        effect(() => {
          const readState = this.dataManagementSchedule.isRead();
          if (readState.count > 0 && this.drawRowHeader.isCanvasAvailable()) {
            this.drawRowHeader.redraw();
          }
        }),
      );

      this.effects.push(
        effect(() => {
          this.settings.timelineMode();
          setTimeout(() => {
            if (this.isDestroyed) return;
            if (this.drawRowHeader.isCanvasAvailable()) {
              this.drawRowHeader.createCanvas();
              this.drawRowHeader.rebuild();
              this.drawRowHeader.redraw();
            }
          }, 0);
        }),
      );

      this.effects.push(
        effect(() => {
          const _t = this.workScheduleLoader.periodHoursUpdated();
          if (this.drawRowHeader.isCanvasAvailable()) {
            this.drawRowHeader.redraw();
          }
        }),
      );
    });
  }
}

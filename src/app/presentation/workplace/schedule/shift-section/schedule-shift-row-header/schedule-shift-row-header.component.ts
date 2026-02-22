// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Component rendering the row headers for the shift grid.
 * Displays shift information (name, abbreviation, icons) in a fixed left column.
 * Handles scrolling synchronization with the main shift grid.
 *
 * @relations
 * - Parent: ShiftSectionComponent
 * - Uses: ShiftDrawRowHeaderService for rendering
 * - Uses: ShiftCreateRowHeaderService for content creation
 */
import {
  AfterViewInit,
  Component,
  EffectRef,
  ElementRef,
  inject,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  runInInjectionContext,
  SimpleChanges,
  ViewChild,
  effect,
} from '@angular/core';
import { Subject } from 'rxjs';
import { ResizeDirective } from 'src/app/presentation/directives/resize.directive';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { ScrollEventService } from 'src/app/presentation/shared/scrollbar/scroll-event.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ShiftRowHeaderCanvasService } from './services/shift-row-header-canvas.service';
import { ShiftCreateRowHeaderService } from './services/shift-create-row-header.service';
import { ShiftDrawRowHeaderService } from './services/shift-draw-row-header.service';
import { ShiftRowHeaderIconsService } from './services/shift-row-header-icons.service';
import { ShiftRowHeaderEventsDirective } from './directives/shift-row-header-events.directive';
import { ProgressBarAnimationService } from 'src/app/presentation/shared/grid/services/progress-bar-animation.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';

@Component({
  selector: 'app-schedule-shift-row-header',
  templateUrl: './schedule-shift-row-header.component.html',
  styleUrls: ['./schedule-shift-row-header.component.scss'],
  standalone: true,
  imports: [ResizeDirective, ShiftRowHeaderEventsDirective],
  providers: [
    ShiftRowHeaderCanvasService,
    ShiftCreateRowHeaderService,
    ShiftDrawRowHeaderService,
    ShiftRowHeaderIconsService,
    ProgressBarAnimationService,
  ],
})
export class ScheduleShiftRowHeaderComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('box') boxElement!: ElementRef<HTMLDivElement>;

  @Input() valueChangeVScrollbar!: number;
  @Input() selectedRow = -1;
  @Input() isSelectedRowActive = false;

  private injector = inject(Injector);
  private scroll = inject(ScrollService);
  private scrollEventService = inject(ScrollEventService);
  private drawRowHeader = inject(ShiftDrawRowHeaderService);
  private dataService = inject(BaseDataService);
  private settings = inject(BaseSettingsService);
  private dataManagementSchedule = inject(DataManagementScheduleService);

  private ngUnsubscribe = new Subject<void>();
  private effects: EffectRef[] = [];

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
    if (changes['valueChangeVScrollbar']) {
      const prevV = changes['valueChangeVScrollbar'].previousValue;
      const currV = changes['valueChangeVScrollbar'].currentValue;
      if (currV !== prevV) {
        this.scroll.verticalScrollPosition = currV;
      }
    }
    if (changes['selectedRow'] || changes['isSelectedRowActive']) {
      this.drawRowHeader.selectedRow = this.selectedRow;
      this.drawRowHeader.isSelectedRowActive = this.isSelectedRowActive;
      if (this.drawRowHeader.isCanvasAvailable()) {
        this.drawRowHeader.refresh();
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
      const refreshEffect = effect(() => {
        this.dataService.refreshSignal();
        if (this.drawRowHeader.isCanvasAvailable()) {
          this.drawRowHeader.redraw();
        }
      });
      this.effects.push(refreshEffect);

      const dataReadEffect = effect(() => {
        const readState = this.dataManagementSchedule.isShiftScheduleRead();
        if (readState.value) {
          this.drawRowHeader.redraw();
        }
      });
      this.effects.push(dataReadEffect);

      const scrollEffect = effect(() => {
        this.scrollEventService.scrollPosition();
        if (this.drawRowHeader.isCanvasAvailable()) {
          this.drawRowHeader.moveGrid();
        }
      });
      this.effects.push(scrollEffect);

      const zoomEffect = effect(() => {
        this.settings.zoomSignal();
        if (this.drawRowHeader.isCanvasAvailable()) {
          this.drawRowHeader.redraw();
        }
      });
      this.effects.push(zoomEffect);
    });
  }
}

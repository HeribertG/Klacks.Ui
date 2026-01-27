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
import { TranslateService } from '@ngx-translate/core';
import { TooltipService } from 'src/app/presentation/shared/tooltip/tooltip.service';

@Component({
  selector: 'app-schedule-schedule-row-header',
  templateUrl: './schedule-schedule-row-header.component.html',
  styleUrls: ['./schedule-schedule-row-header.component.scss'],
  standalone: true,
  imports: [NgStyle, ResizeDirective, ScheduleRowHeaderEventsDirective, ClientFilterComponent],
  providers: [
    BaseCreateRowHeaderService,
    BaseDrawRowHeaderService,
    ProgressBarAnimationService
  ],
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
  private translateService = inject(TranslateService);
  private tooltipService = inject(TooltipService);

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
        this.tooltipService.hide();
        return;
      } else {
        this.currentCursor = CursorEnum.default;
      }
    }

    if (this.checkContractSymbolTooltip(event, pos)) {
      return;
    }

    this.checkInfoSpotTooltip(event, pos);
  }

  private checkContractSymbolTooltip(event: MouseEvent, pos: { x: number; y: number }): boolean {
    const canvas = this.drawRowHeader.canvas;
    if (!canvas) return false;

    const row = Math.floor((pos.y - this.settings.cellHeaderHeight) / this.settings.cellHeight) + this.scroll.verticalScrollPosition;
    if (row < 0 || row >= this.dataService.rows) return false;

    const clientIndex = this.dataService.rowGroupIndex[row];
    if (clientIndex === undefined) return false;

    const client = this.dataService.getGroupIndex(clientIndex);
    if (!client || client.hasContract) return false;

    const firstRow = this.dataService.indexGroupRow[clientIndex];
    const cellHeight = this.settings.cellHeight;
    const localY = pos.y - this.settings.cellHeaderHeight - ((firstRow - this.scroll.verticalScrollPosition) * cellHeight);
    const sectionHeight = cellHeight / 3;

    if (localY >= 0 && localY <= sectionHeight && pos.x >= 0 && pos.x <= 24) {
      const tooltipText = this.translateService.instant('schedule.row-header.no-contract.tooltip');
      this.tooltipService.show({
        text: tooltipText,
        x: event.clientX,
        y: event.clientY,
      });
      return true;
    }

    return false;
  }

  private checkInfoSpotTooltip(event: MouseEvent, pos: { x: number; y: number }): void {
    const canvas = this.drawRowHeader.canvas;
    if (!canvas) {
      this.tooltipService.hide();
      return;
    }

    const row = Math.floor((pos.y - this.settings.cellHeaderHeight) / this.settings.cellHeight) + this.scroll.verticalScrollPosition;

    if (row < 0 || row >= this.dataService.rows) {
      this.tooltipService.hide();
      return;
    }

    const clientIndex = this.dataService.rowGroupIndex[row];
    if (clientIndex === undefined) {
      this.tooltipService.hide();
      return;
    }

    const firstRow = this.dataService.indexGroupRow[clientIndex];
    const client = this.dataService.getGroupIndex(clientIndex);
    const lastRow = firstRow + (client?.neededRows ?? 1) - 1;

    if (row < firstRow || row > lastRow) {
      this.tooltipService.hide();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const visualWidth = rect.width;
    const canvasWidth = canvas.width;
    const scale = canvasWidth / visualWidth;

    const widthWithoutInfoSpot = visualWidth - (this.settings.InfoSpotWidth / scale);

    if (pos.x < widthWithoutInfoSpot) {
      this.tooltipService.hide();
      return;
    }

    const localY = pos.y - this.settings.cellHeaderHeight - ((firstRow - this.scroll.verticalScrollPosition) * this.settings.cellHeight);

    const slot1Top = this.settings.increaseBorder;
    const slot1Bottom = this.settings.cellHeaderHeight;
    const slot2Top = this.settings.cellHeaderHeight + this.settings.borderWidth;
    const slot2Bottom = this.settings.cellHeaderHeight * 2 + this.settings.borderWidth;
    const slot3Top = this.settings.cellHeaderHeight * 2 + this.settings.borderWidth * 2;
    const slot3Bottom = this.settings.cellHeaderHeight * 3 + this.settings.borderWidth;

    let tooltipKey = '';

    if (localY >= slot1Top && localY <= slot1Bottom) {
      tooltipKey = 'schedule.row-header.slot1.tooltip';
    } else if (localY >= slot2Top && localY <= slot2Bottom) {
      tooltipKey = 'schedule.row-header.slot2.tooltip';
    } else if (localY >= slot3Top && localY <= slot3Bottom) {
      tooltipKey = 'schedule.row-header.slot3.tooltip';
    }

    if (tooltipKey) {
      const tooltipText = this.translateService.instant(tooltipKey);
      this.tooltipService.show({
        text: tooltipText,
        x: event.clientX,
        y: event.clientY,
      });
    } else {
      this.tooltipService.hide();
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

  onCanvasMouseLeave(): void {
    this.tooltipService.hide();
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

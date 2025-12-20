import {
  Component,
  ViewChild,
  inject,
  AfterViewInit,
  EventEmitter,
  Output,
  Input,
  effect,
  OnDestroy,
  OnInit,
  runInInjectionContext,
  EffectRef,
  Injector,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { AngularSplitModule, SplitComponent } from 'angular-split';
import { ScheduleScheduleRowHeaderComponent } from './schedule-schedule-row-header/schedule-schedule-row-header.component';
import { HScrollbarComponent } from 'src/app/presentation/shared/h-scrollbar/h-scrollbar.component';
import { VScrollbarComponent } from 'src/app/presentation/shared/v-scrollbar/v-scrollbar.component';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { BaseCellRenderService } from '../../../shared/grid/services/body/cell-render.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { BaseCreateRowHeaderService } from 'src/app/presentation/workplace/schedule/schedule-section/services/create-row-header.service';
import { BaseDrawRowHeaderService } from 'src/app/presentation/workplace/schedule/schedule-section/services/draw-row-header.service';
import { BaseGridRenderService } from 'src/app/presentation/shared/grid/services/body/grid-render.service';
import { BaseDrawScheduleService } from 'src/app/presentation/shared/grid/services/body/draw-schedule.service';
import { BaseCanvasManagerService } from 'src/app/presentation/shared/grid/services/body/canvas-manager.service';
import { BaseCreateHeaderService } from 'src/app/presentation/shared/grid/services/body/create-header.service';
import { BaseCreateCellService } from 'src/app/presentation/shared/grid/services/body/create-cell.service';
import {
  BaseCellManipulationService,
  HoveredCellInfo,
} from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { CellIconsService } from 'src/app/presentation/shared/grid/services/body/cell-icons.service';
import { Subject, takeUntil } from 'rxjs';
import { ScheduleSurfaceTemplateComponent } from 'src/app/presentation/shared/grid/body/schedule-surface-template/schedule-surface-template.component';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ScheduleHorizontalScrollService } from '../services/schedule-horizontal-scroll.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { TranslateService } from '@ngx-translate/core';
import { MultiLanguage } from 'src/app/domain/models/multi-language-class';
import { Language } from 'src/app/application/helpers/sharedItems';
import { MessageLibrary } from 'src/app/domain/constants/message-library';
import { ShiftDropResult } from '../services/shift-to-schedule-drag-drop.service';
import { ScheduleDataService } from './services/schedule-data.service';

@Component({
  selector: 'app-schedule-section',
  standalone: true,
  imports: [
    AngularSplitModule,
    ScheduleScheduleRowHeaderComponent,
    HScrollbarComponent,
    VScrollbarComponent,
    ScheduleSurfaceTemplateComponent,
  ],
  providers: [
    BaseSettingsService,
    ScrollService,
    BaseCellManipulationService,
    BaseCellRenderService,
    BaseCreateCellService,
    BaseCreateHeaderService,
    BaseCreateRowHeaderService,
    BaseDrawRowHeaderService,
    BaseDrawScheduleService,
    BaseCanvasManagerService,
    BaseGridRenderService,
    CellIconsService,
  ],
  templateUrl: './schedule-section.component.html',
  styleUrls: ['./schedule-section.component.scss'],
})
export class ScheduleSectionComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('splitEl', { static: true }) splitEl!: SplitComponent;
  @ViewChild('scheduleHScrollbar', { static: true })
  scheduleHScrollbar!: HScrollbarComponent;
  @ViewChild('scheduleSurface', { static: true })
  scheduleSurface!: ScheduleSurfaceTemplateComponent;

  @Input() horizontalSize = 200;
  @Input() zoom = 1.0;
  @Input() refreshTrigger = false;

  @Output() horizontalSizeChange = new EventEmitter<number>();

  public hScrollbar = { value: 0, maxValue: 0, visibleValue: 0 };
  public vScrollbar = { value: 0, maxValue: 0, visibleValue: 0 };
  public vScrollbarSize = 17;
  public hScrollbarSize = 17;

  private dataManagement = inject(DataManagementScheduleService);
  private scrollService = inject(ScrollService);
  private injector = inject(Injector);
  private settings = inject(BaseSettingsService);
  private hScrollService = inject(ScheduleHorizontalScrollService);
  private groupSelectionService = inject(GroupSelectionService);
  private cellManipulation = inject(BaseCellManipulationService);
  private translateService = inject(TranslateService);

  private currentLang: Language = MessageLibrary.DEFAULT_LANG;
  private defaultVScrollbarSize = 17;
  private defaultHScrollbarSize = 17;

  private destroy$ = new Subject<void>();
  private effects: EffectRef[] = [];
  private scheduleDataLoaded = false;
  private shiftDataLoaded = false;
  private workScheduleLoaded = false;
  private initialSyncDone = false;

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['zoom'] && !changes['zoom'].firstChange) {
      this.settings.zoom = this.zoom;
    }

    if (changes['refreshTrigger'] && !changes['refreshTrigger'].firstChange) {
      this.scheduleSurface.Refresh();
    }
  }

  ngAfterViewInit() {
    this.hScrollService.lock();
    this.readSignals();
    this.applyGlobalGroupSelection();
    this.dataManagement.readDatas();

    this.splitEl.dragProgress$.pipe(takeUntil(this.destroy$)).subscribe((x) => {
      const newSize = x.sizes[0] as number;
      this.horizontalSizeChange.emit(newSize + 5);
    });

    this.scheduleHScrollbar.valueChange
      .pipe(takeUntil(this.destroy$))
      .subscribe((value: number) => {
        this.hScrollService.setPosition(value);
      });

    this.scheduleHScrollbar.maxValueChange
      .pipe(takeUntil(this.destroy$))
      .subscribe((value: number) => {
        this.hScrollService.setMaxValue(value);
      });
  }

  private applyGlobalGroupSelection(): void {
    const globalGroupId = this.groupSelectionService.selectedGroupId;
    if (globalGroupId !== undefined) {
      this.dataManagement.workFilter.selectedGroup = globalGroupId;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    this.effects.forEach((e) => e?.destroy());
    this.effects = [];
  }

  private updateScrollbarSizes() {
    const hostElement = document.querySelector(
      'app-schedule-section'
    ) as HTMLElement;
    if (hostElement) {
      hostElement.style.setProperty(
        '--v-scrollbar-size',
        `${this.vScrollbarSize}px`
      );
      hostElement.style.setProperty(
        '--h-scrollbar-size',
        `${this.hScrollbarSize}px`
      );
    }
  }

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      const dataReadEffect = effect(() => {
        const isRead = this.dataManagement.isRead();
        if (isRead) {
          this.scheduleSurface.Refresh();
          this.scheduleDataLoaded = true;
          this.workScheduleLoaded = true;
          this.onAllDataReady();
        }
      });
      this.effects.push(dataReadEffect);

      const shiftReadEffect = effect(() => {
        const isShiftRead = this.dataManagement.isShiftScheduleRead();
        if (isShiftRead) {
          this.shiftDataLoaded = true;
          this.onAllDataReady();
        }
      });
      this.effects.push(shiftReadEffect);

      const vScrollbarSizeEffect = effect(() => {
        const isLocked = this.scrollService.lockedRows();
        this.vScrollbarSize = isLocked ? 0 : this.defaultVScrollbarSize;
        this.updateScrollbarSizes();
      });
      this.effects.push(vScrollbarSizeEffect);

      const hScrollbarSizeEffect = effect(() => {
        const isLocked = this.scrollService.lockedCols();
        this.hScrollbarSize = isLocked ? 0 : this.defaultHScrollbarSize;
        this.updateScrollbarSizes();
      });
      this.effects.push(hScrollbarSizeEffect);

      const hScrollPositionEffect = effect(() => {
        const position = this.hScrollService.horizontalPosition();
        if (this.initialSyncDone && this.hScrollbar.value !== position) {
          this.hScrollbar.value = position;
          this.scrollService.horizontalScrollPosition = position;
        }
      });
      this.effects.push(hScrollPositionEffect);

      const hoveredCellEffect = effect(() => {
        const hoveredCell = this.cellManipulation.hoveredCell();
        this.handleHoveredCellChange(hoveredCell);
      });
      this.effects.push(hoveredCellEffect);
    });
  }

  private handleHoveredCellChange(hoveredCell: HoveredCellInfo | null): void {
    if (!hoveredCell) {
      this.scheduleSurface.destroyToolTip();
      return;
    }

    if (hoveredCell.isEmpty) {
      const holiday = this.scheduleSurface.dataService.holidayInfo(hoveredCell.column);
      if (holiday?.currentName) {
        const holidayName = this.getTranslatedText(holiday.currentName);
        if (holidayName) {
          this.scheduleSurface.showToolTip({
            value: holidayName,
            event: { clientX: hoveredCell.clientX, clientY: hoveredCell.clientY } as MouseEvent,
          });
          return;
        }
      }
    }

    this.scheduleSurface.destroyToolTip();
  }

  private getTranslatedText(multiLanguage: MultiLanguage): string {
    return multiLanguage[this.currentLang] || multiLanguage.de || '';
  }

  onVisibleValueHScrollbarChange(value: number): void {
    this.hScrollbar.visibleValue = value;
    this.hScrollService.setVisibleValue(value);
  }

  private onAllDataReady(): void {
    if (this.scheduleDataLoaded && this.shiftDataLoaded && this.workScheduleLoaded) {
      const dayVisibleBeforeMonth =
        this.dataManagement.workFilter.dayVisibleBeforeMonth;

      setTimeout(() => {
        this.scrollService.horizontalScrollPosition = dayVisibleBeforeMonth;
        this.hScrollbar.value = dayVisibleBeforeMonth;
        this.hScrollService.forceSetPosition(dayVisibleBeforeMonth);
        this.initialSyncDone = true;

        setTimeout(() => {
          this.hScrollService.unlock();
        }, 500);
      }, 300);

      this.scheduleDataLoaded = false;
      this.shiftDataLoaded = false;
      this.workScheduleLoaded = false;
    }
  }

  getDropTargetInfo(
    mouseY: number,
    column: number
  ): { row: number; clientId: string; date: Date; isEmpty: boolean } | null {
    const scheduleElement = document.querySelector('app-schedule-section .box');
    if (!scheduleElement) {
      return null;
    }

    const rect = scheduleElement.getBoundingClientRect();
    const relativeY = mouseY - rect.top - this.settings.cellHeaderHeight;

    if (relativeY < 0) {
      return null;
    }

    const row =
      Math.floor(relativeY / this.settings.cellHeight) +
      this.scrollService.verticalScrollPosition;

    const dataService = this.scheduleSurface.dataService as ScheduleDataService;

    if (row < 0 || row >= dataService.rows) {
      return null;
    }

    const clientIndex = dataService.rowGroupIndex[row];
    if (clientIndex === undefined) {
      return null;
    }

    const client = this.dataManagement.clients[clientIndex];
    if (!client || !client.id) {
      return null;
    }

    const date = dataService.getDateForColumn(column);
    if (!date) {
      return null;
    }

    const isEmpty = !dataService.isCellActive(row, column);

    return {
      row,
      clientId: client.id,
      date,
      isEmpty,
    };
  }

  handleShiftDrop(result: ShiftDropResult): void {
    this.dataManagement.addWorkScheduleEntry({
      clientId: result.targetClientId,
      date: result.targetDate,
      shiftId: result.shiftId,
      workTime: result.workTime,
    });
  }
}

import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  effect,
  EffectRef,
  inject,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  runInInjectionContext,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AngularSplitModule } from 'angular-split';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ScheduleShiftRowHeaderComponent } from './schedule-shift-row-header/schedule-shift-row-header.component';
import { ShiftFilterComponent } from './shift-filter/shift-filter.component';
import { VScrollbarComponent } from 'src/app/presentation/shared/v-scrollbar/v-scrollbar.component';
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
import { MultiLanguage } from 'src/app/domain/models/multi-language-class';
import { Language } from 'src/app/application/helpers/sharedItems';
import { MessageLibrary } from 'src/app/domain/constants/message-library';
import { BaseCellRenderService } from 'src/app/presentation/shared/grid/services/body/cell-render.service';
import { CellIconsService } from 'src/app/presentation/shared/grid/services/body/cell-icons.service';
import { GridSurfaceTemplateComponent } from 'src/app/presentation/shared/grid/body/grid-surface-template/grid-surface-template.component';
import { IconFilterComponent } from 'src/app/presentation/icons/icon-filter.component';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ShiftSettingsService } from './services/shift-settings.service';
import { ShiftDataService } from './services/shift-data.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ScheduleHorizontalScrollService } from '../services/schedule-horizontal-scroll.service';
import { WorkNotificationService } from 'src/app/domain/services/schedule/work-notification.service';
import { ShowInShiftService } from '../services/show-in-shift.service';

@Component({
  selector: 'app-shift-section',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AngularSplitModule,
    NgbDropdownModule,
    NgbTooltipModule,
    ScheduleShiftRowHeaderComponent,
    VScrollbarComponent,
    GridSurfaceTemplateComponent,
    IconFilterComponent,
    ShiftFilterComponent,
  ],
  providers: [
    { provide: BaseDataService, useClass: ShiftDataService },
    { provide: BaseSettingsService, useClass: ShiftSettingsService },
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
  templateUrl: './shift-section.component.html',
  styleUrls: ['./shift-section.component.scss'],
})
export class ShiftSectionComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('shiftSurface', { static: true })
  shiftSurface!: GridSurfaceTemplateComponent;

  private dataManagement = inject(DataManagementScheduleService);
  private injector = inject(Injector);
  private scrollService = inject(ScrollService);
  private settings = inject(BaseSettingsService);
  private hScrollService = inject(ScheduleHorizontalScrollService);
  private cdr = inject(ChangeDetectorRef);
  private cellManipulation = inject(BaseCellManipulationService);
  private dataService = inject(BaseDataService);
  private translateService = inject(TranslateService);
  private workNotificationService = inject(WorkNotificationService);
  private showInShiftService = inject(ShowInShiftService);

  private currentLang: Language = MessageLibrary.DEFAULT_LANG;

  @Input() horizontalSize!: number;
  @Input() zoom = 1.0;
  @Input() refreshTrigger = false;

  public hScrollPositionValue = 0;
  public vScrollbar = { value: 0, maxValue: 0, visibleValue: 0 };
  public vScrollbarShift = { value: 0, maxValue: 0, visibleValue: 0 };
  public vScrollbarSize = 17;
  public selectedRow = -1;
  public isSelectedRowActive = false;

  private defaultVScrollbarSize = 17;

  get shiftRowCount(): number {
    return this.dataService.rows;
  }

  get isShiftFiltered(): boolean {
    const filter = this.dataManagement.shiftScheduleFilter;
    return (
      !!filter.searchString ||
      !filter.isSporadic ||
      !filter.isTimeRange ||
      !filter.container ||
      !filter.isStandartShift
    );
  }

  private effects: EffectRef[] = [];

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;
  }

  ngAfterViewInit(): void {
    this.readSignals();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['zoom'] && !changes['zoom'].firstChange) {
      this.settings.zoom = this.zoom;
    }

    if (changes['refreshTrigger'] && !changes['refreshTrigger'].firstChange) {
      this.shiftSurface.Refresh();
    }
  }

  ngOnDestroy(): void {
    this.effects.forEach((e) => e?.destroy());
    this.effects = [];
  }

  onHScrollChange(value: number): void {
    if (this.hScrollService.isLocked()) {
      return;
    }
    this.hScrollService.setPosition(value);
  }

  private updateScrollbarSizes() {
    const hostElement = document.querySelector(
      'app-shift-section'
    ) as HTMLElement;
    if (hostElement) {
      hostElement.style.setProperty(
        '--v-scrollbar-size',
        `${this.vScrollbarSize}px`
      );
    }
  }

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      const dataReadEffect = effect(() => {
        const readState = this.dataManagement.isShiftScheduleRead();
        if (readState.value) {
          this.shiftSurface.Refresh(readState.resetScroll);
          const position = this.hScrollService.horizontalPosition();
          if (position > 0) {
            this.hScrollPositionValue = position;
            this.scrollService.horizontalScrollPosition = position;
          }
        }
      });
      this.effects.push(dataReadEffect);

      const vScrollbarSizeEffect = effect(() => {
        const isLocked = this.scrollService.lockedRows();
        this.vScrollbarSize = isLocked ? 0 : this.defaultVScrollbarSize;
        this.updateScrollbarSizes();
      });
      this.effects.push(vScrollbarSizeEffect);

      const hScrollEffect = effect(() => {
        const position = this.hScrollService.horizontalPosition();
        this.hScrollPositionValue = position;
        this.scrollService.horizontalScrollPosition = position;
        this.cdr.detectChanges();
      });
      this.effects.push(hScrollEffect);

      const positionEffect = effect(() => {
        const pos = this.cellManipulation.positionSignal();
        this.selectedRow = pos.row;
        if (pos.row >= 0 && pos.column >= 0) {
          this.isSelectedRowActive = this.dataService.isCellActive(
            pos.row,
            pos.column
          );
        } else {
          this.isSelectedRowActive = false;
        }
        this.cdr.detectChanges();
      });
      this.effects.push(positionEffect);

      const hoveredCellEffect = effect(() => {
        const hoveredCell = this.cellManipulation.hoveredCell();
        this.handleHoveredCellChange(hoveredCell);
      });
      this.effects.push(hoveredCellEffect);

      const shiftUpdateEffect = effect(() => {
        const updateId = this.workNotificationService.shiftUpdateSignal();
        if (updateId) {
          this.shiftSurface.Refresh(false);
        }
      });
      this.effects.push(shiftUpdateEffect);

      const showInShiftEffect = effect(() => {
        const request = this.showInShiftService.request();
        if (request) {
          this.scrollToShift(request.shiftId, request.column);
          this.showInShiftService.clear();
        }
      });
      this.effects.push(showInShiftEffect);
    });
  }

  private scrollToShift(shiftId: string, column: number): void {
    const shiftDataService = this.dataService as ShiftDataService;
    const rowIndex = shiftDataService.findRowByShiftIdAndColumn(shiftId, column);

    if (rowIndex >= 0) {
      const visibleRows = Math.floor(
        (this.shiftSurface.drawSchedule.height - this.settings.cellHeaderHeight) /
          this.settings.cellHeight
      );
      const targetScroll = Math.max(0, rowIndex - Math.floor(visibleRows / 2));

      this.vScrollbar.value = targetScroll;
      this.scrollService.verticalScrollPosition = targetScroll;
      this.shiftSurface.drawSchedule.moveGrid();
      this.cdr.detectChanges();
    }
  }

  private handleHoveredCellChange(hoveredCell: HoveredCellInfo | null): void {
    if (!hoveredCell) {
      this.shiftSurface.destroyToolTip();
      return;
    }

    if (hoveredCell.isEmpty) {
      const holiday = this.shiftSurface.dataService.holidayInfo(hoveredCell.column);
      if (holiday?.currentName) {
        const holidayName = this.getTranslatedText(holiday.currentName);
        if (holidayName) {
          this.shiftSurface.showToolTip({
            value: holidayName,
            event: { clientX: hoveredCell.clientX, clientY: hoveredCell.clientY } as MouseEvent,
          });
          return;
        }
      }
    }

    this.shiftSurface.destroyToolTip();
  }

  private getTranslatedText(multiLanguage: MultiLanguage): string {
    return multiLanguage[this.currentLang] || multiLanguage.de || '';
  }
}

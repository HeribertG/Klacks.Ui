/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Component displaying the shift grid showing available shifts per day.
 * Shows shift capacity, engagement status, and supports drag to schedule.
 * Includes filter functionality and context menu for navigation.
 *
 * @relations
 * - Parent: ScheduleContainerComponent
 * - Contains: GridSurfaceTemplateComponent, ShiftFilterComponent
 * - Uses: ShiftDataService, ShiftContextMenuService, ShiftNavigationService
 * - Coordinates with: ShiftToScheduleDragDropService for drag operations
 */
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
import { TranslateModule } from '@ngx-translate/core';
import { AngularSplitModule } from 'angular-split';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
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
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import {
  ScheduleTooltipService,
  TooltipState,
} from '../services/schedule-tooltip.service';
import { BaseCellRenderService } from 'src/app/presentation/shared/grid/services/body/cell-render.service';
import { CellIconsService } from 'src/app/presentation/shared/grid/services/body/cell-icons.service';
import {
  GridSurfaceRightClickEvent,
  GridSurfaceTemplateComponent,
} from 'src/app/presentation/shared/grid/body/grid-surface-template/grid-surface-template.component';
import { IconFilterComponent } from 'src/app/presentation/icons/icon-filter.component';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ShiftSettingsService } from './services/shift-settings.service';
import { ShiftDataService } from './services/shift-data.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ScheduleHorizontalScrollService } from '../services/schedule-horizontal-scroll.service';
import { WorkNotificationService } from 'src/app/domain/services/schedule/work-notification.service';
import { ShowInShiftService } from '../services/show-in-shift.service';
import { ContextMenuComponent } from 'src/app/presentation/shared/context-menu/context-menu.component';
import { ContextMenuService } from 'src/app/presentation/shared/context-menu/context-menu.service';
import { ShiftContextMenuService } from './services/shift-context-menu.service';
import { ShiftNavigationService } from './services/shift-navigation.service';
import { ShiftPdfExportService } from './services/shift-pdf-export.service';
import { PdfIconComponent } from 'src/app/presentation/icons/pdf-icon.component';

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
    ContextMenuComponent,
    PdfIconComponent,
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
    ContextMenuService,
    ShiftContextMenuService,
    ShiftNavigationService,
  ],
  templateUrl: './shift-section.component.html',
  styleUrls: ['./shift-section.component.scss'],
})
export class ShiftSectionComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('shiftSurface', { static: true })
  shiftSurface!: GridSurfaceTemplateComponent;
  @ViewChild('contextMenu', { static: false })
  contextMenu!: ContextMenuComponent;

  private dataManagement = inject(DataManagementScheduleService);
  private injector = inject(Injector);
  private scrollService = inject(ScrollService);
  private settings = inject(BaseSettingsService);
  private hScrollService = inject(ScheduleHorizontalScrollService);
  private cdr = inject(ChangeDetectorRef);
  private cellManipulation = inject(BaseCellManipulationService);
  private dataService = inject(BaseDataService);
  private tooltipService = inject(ScheduleTooltipService);
  private workNotificationService = inject(WorkNotificationService);
  private showInShiftService = inject(ShowInShiftService);
  private contextMenuService = inject(ShiftContextMenuService);
  private navigationService = inject(ShiftNavigationService);
  private shiftPdfExportService = inject(ShiftPdfExportService);

  private tooltipState: TooltipState = { lastHeaderColumn: -1 };
  private destroy$ = new Subject<void>();

  @Input() horizontalSize!: number;
  @Input() zoom = 1.0;
  @Input() refreshTrigger = false;
  @Input() hScrollPosition = 0;

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
    this.tooltipService.initLanguage();
  }

  ngAfterViewInit(): void {
    this.readSignals();

    this.contextMenu?.hasClicked
      .pipe(takeUntil(this.destroy$))
      .subscribe((keys) => {
        this.menuClicked(keys);
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['zoom'] && !changes['zoom'].firstChange) {
      this.settings.zoom = this.zoom;
    }

    if (changes['refreshTrigger'] && !changes['refreshTrigger'].firstChange) {
      this.shiftSurface.Refresh();
    }

    if (changes['hScrollPosition']) {
      const position = changes['hScrollPosition'].currentValue;
      this.hScrollPositionValue = position;
      this.scrollService.horizontalScrollPosition = position;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

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
        '--v-shift-scrollbar-size',
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
        }
      });
      this.effects.push(dataReadEffect);

      const vScrollbarSizeEffect = effect(() => {
        const isLocked = this.scrollService.lockedRows();
        const hasRows = this.dataService.rows > 0;
        this.vScrollbarSize = (isLocked || !hasRows) ? 0 : this.defaultVScrollbarSize;
        this.updateScrollbarSizes();
      });
      this.effects.push(vScrollbarSizeEffect);


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
        this.tooltipService.handleHoveredCell(
          hoveredCell,
          this.dataService,
          this.shiftSurface,
          this.tooltipState,
          false
        );
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
    this.navigationService.scrollToShift(
      shiftId,
      column,
      shiftDataService,
      this.shiftSurface.drawSchedule.height,
      this.vScrollbar,
      () => {
        this.shiftSurface.drawSchedule.moveGrid();
        this.cdr.detectChanges();
      }
    );
  }

  onShiftPdfExport(): void {
    this.shiftPdfExportService.exportShiftSchedule();
  }

  onRightClick(event: GridSurfaceRightClickEvent): void {
    if (!this.contextMenu) return;

    this.contextMenu.closeMenu();
    this.createContextMenu(event.row, event.column);
    this.contextMenu.openMenu({
      clientX: event.clientX,
      clientY: event.clientY,
    } as MouseEvent);
  }

  private createContextMenu(row: number, column: number): void {
    const shiftDataService = this.dataService as ShiftDataService;
    this.contextMenu.menuData = this.contextMenuService.createContextMenu(row, column, shiftDataService);
  }

  private menuClicked(keys: string[]): void {
    if (!keys || keys.length === 0) return;

    switch (keys[0]) {
      case 'showInSchedule': {
        this.contextMenu.closeMenu(true);
        const shiftDataService = this.dataService as ShiftDataService;
        this.contextMenuService.showSelectedShiftInScheduleSection(shiftDataService);
        break;
      }
    }
  }
}

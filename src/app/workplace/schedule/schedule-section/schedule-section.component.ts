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
  runInInjectionContext,
  EffectRef,
  Injector,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { AngularSplitModule, SplitComponent } from 'angular-split';
import { ScheduleScheduleRowHeaderComponent } from './schedule-schedule-row-header/schedule-schedule-row-header.component';
import { HScrollbarComponent } from 'src/app/shared/h-scrollbar/h-scrollbar.component';
import { VScrollbarComponent } from 'src/app/shared/v-scrollbar/v-scrollbar.component';
import { DataManagementScheduleService } from 'src/app/data/management/data-management-schedule.service';
import { BaseCellRenderService } from '../../../shared/grid/services/body/cell-render.service';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';
import { BaseCreateRowHeaderService } from 'src/app/shared/grid/services/row-header/create-row-header.service';
import { BaseDrawRowHeaderService } from 'src/app/shared/grid/services/row-header/draw-row-header.service';
import { BaseGridRenderService } from 'src/app/shared/grid/services/body/grid-render.service';
import { BaseDrawScheduleService } from 'src/app/shared/grid/services/body/draw-schedule.service';
import { BaseCanvasManagerService } from 'src/app/shared/grid/services/body/canvas-manager.service';
import { BaseCreateHeaderService } from 'src/app/shared/grid/services/body/create-header.service';
import { BaseCreateCellService } from 'src/app/shared/grid/services/body/create-cell.service';
import { BaseCellManipulationService } from 'src/app/shared/grid/services/body/cell-manipulation.service';
import { Subject, takeUntil } from 'rxjs';
import { ScheduleSurfaceTemplateComponent } from 'src/app/shared/grid/body/schedule-surface-template/schedule-surface-template.component';
import { BaseSettingsService } from 'src/app/shared/grid/services/data-setting/settings.service';

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
  ],
  templateUrl: './schedule-section.component.html',
  styleUrls: ['./schedule-section.component.scss'],
})
export class ScheduleSectionComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('splitEl', { static: true }) splitEl!: SplitComponent;
  @ViewChild('scheduleHScrollbar', { static: true })
  scheduleHScrollbar!: HScrollbarComponent;
  @ViewChild('scheduleSurface', { static: true })
  scheduleSurface!: ScheduleSurfaceTemplateComponent;

  @Input() horizontalSize = 200;
  @Input() zoom = 1.0;

  @Output() horizontalSizeChange = new EventEmitter<number>();
  @Output() valueHScrollbarChange = new EventEmitter<number>();
  @Output() maxValueHScrollbarChange = new EventEmitter<number>();

  public hScrollbar = { value: 0, maxValue: 0, visibleValue: 0 };
  public vScrollbar = { value: 0, maxValue: 0, visibleValue: 0 };
  public vScrollbarSize = 17;
  public hScrollbarSize = 17;

  private dataManagement = inject(DataManagementScheduleService);
  private scrollService = inject(ScrollService);
  private injector = inject(Injector);
  private settings = inject(BaseSettingsService);

  private defaultVScrollbarSize = 17;
  private defaultHScrollbarSize = 17;

  private destroy$ = new Subject<void>();
  private effects: EffectRef[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['zoom'] && !changes['zoom'].firstChange) {
      this.settings.zoom = this.zoom;
    }
  }

  ngAfterViewInit() {
    this.readSignals();
    this.dataManagement.readDatas();

    this.splitEl.dragProgress$.pipe(takeUntil(this.destroy$)).subscribe((x) => {
      const newSize = x.sizes[0] as number;
      this.horizontalSizeChange.emit(newSize + 5);
    });

    this.scheduleHScrollbar.valueChange
      .pipe(takeUntil(this.destroy$))
      .subscribe((value: number) => {
        this.valueHScrollbarChange.emit(value);
      });

    this.scheduleHScrollbar.maxValueChange
      .pipe(takeUntil(this.destroy$))
      .subscribe((value: number) => {
        this.maxValueHScrollbarChange.emit(value);
      });
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
        if (this.dataManagement.isRead()) {
          this.scheduleSurface.Refresh();
        }
      });
      this.effects.push(dataReadEffect);

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
    });
  }
}

/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  AfterViewInit,
  Component,
  effect,
  EffectRef,
  EventEmitter,
  inject,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  runInInjectionContext,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { AngularSplitModule } from 'angular-split';
import { ScheduleShiftRowHeaderComponent } from './schedule-shift-row-header/schedule-shift-row-header.component';
import { VScrollbarComponent } from 'src/app/shared/v-scrollbar/v-scrollbar.component';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';
import { BaseCreateRowHeaderService } from 'src/app/shared/grid/services/row-header/create-row-header.service';
import { BaseDrawRowHeaderService } from 'src/app/shared/grid/services/row-header/draw-row-header.service';
import { BaseGridRenderService } from 'src/app/shared/grid/services/body/grid-render.service';
import { BaseDrawScheduleService } from 'src/app/shared/grid/services/body/draw-schedule.service';
import { BaseCanvasManagerService } from 'src/app/shared/grid/services/body/canvas-manager.service';
import { BaseCreateHeaderService } from 'src/app/shared/grid/services/body/create-header.service';
import { BaseCreateCellService } from 'src/app/shared/grid/services/body/create-cell.service';
import { BaseCellManipulationService } from 'src/app/shared/grid/services/body/cell-manipulation.service';
import { BaseCellRenderService } from 'src/app/shared/grid/services/body/cell-render.service';
import { ScheduleSurfaceTemplateComponent } from 'src/app/shared/grid/body/schedule-surface-template/schedule-surface-template.component';
import { BaseDataService } from 'src/app/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/shared/grid/services/data-setting/settings.service';
import { ShiftSettingsService } from './services/shift-settings.service';
import { ShiftDataService } from './services/shift-data.service';
import { DataManagementScheduleService } from 'src/app/data/management/data-management-schedule.service';

@Component({
  selector: 'app-shift-section',
  standalone: true,
  imports: [
    AngularSplitModule,
    ScheduleShiftRowHeaderComponent,
    VScrollbarComponent,
    ScheduleSurfaceTemplateComponent,
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
  ],
  templateUrl: './shift-section.component.html',
  styleUrls: ['./shift-section.component.scss'],
})
export class ShiftSectionComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('shiftSurface', { static: true })
  shiftSurface!: ScheduleSurfaceTemplateComponent;

  private dataManagement = inject(DataManagementScheduleService);
  private injector = inject(Injector);
  private scrollService = inject(ScrollService);
  private settings = inject(BaseSettingsService);

  @Input() horizontalSize!: number;
  @Input() hScrollbarValue!: number;
  @Input() hScrollbarMaxValue!: number;
  @Input() zoom = 1.0;

  public vScrollbar = { value: 0, maxValue: 0, visibleValue: 0 };
  public vScrollbarSize = 17;

  private defaultVScrollbarSize = 17;

  private effects: EffectRef[] = [];

  ngAfterViewInit(): void {
    this.readSignals();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['zoom'] && !changes['zoom'].firstChange) {
      this.settings.zoom = this.zoom;
    }
  }

  ngOnDestroy(): void {
    this.effects.forEach((e) => e?.destroy());
    this.effects = [];
  }

  private updateScrollbarSizes() {
    const hostElement = document.querySelector(
      'app-schedule-section'
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
        if (this.dataManagement.isRead()) {
          this.shiftSurface.Refresh();
        }
      });
      this.effects.push(dataReadEffect);

      const vScrollbarSizeEffect = effect(() => {
        const isLocked = this.scrollService.lockedRows();
        this.vScrollbarSize = isLocked ? 0 : this.defaultVScrollbarSize;
        this.updateScrollbarSizes();
      });
    });
  }
}

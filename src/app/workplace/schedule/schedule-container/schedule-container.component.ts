import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { AngularSplitModule, SplitComponent } from 'angular-split';
import { Subject, takeUntil } from 'rxjs';
import { DataManagementScheduleService } from 'src/app/data/management/data-management-schedule.service';
import { SpinnerService } from 'src/app/spinner/spinner.service';
import { ScheduleHeaderComponent } from '../schedule-header/schedule-header.component';
import { ScheduleHomeComponent } from '../schedule-home/schedule-home.component';
import { ScheduleHScrollbarComponent } from '../schedule-h-scrollbar/schedule-h-scrollbar.component';
import { ScheduleVScrollbarComponent } from '../schedule-v-scrollbar/schedule-v-scrollbar.component';
import { ScheduleScheduleRowHeaderComponent } from '../schedule-schedule-row-header/schedule-schedule-row-header.component';
import { ScheduleScheduleSurfaceComponent } from '../schedule-schedule-surface/schedule-schedule-surface.component';
import { ScheduleShiftSurfaceComponent } from '../schedule-shift-surface/schedule-shift-surface.component';
import { ScheduleShiftRowHeaderComponent } from '../schedule-shift-row-header/schedule-shift-row-header.component';

@Component({
  selector: 'app-schedule-container',
  templateUrl: './schedule-container.component.html',
  styleUrls: ['./schedule-container.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    AngularSplitModule,
    ScheduleHScrollbarComponent,
    ScheduleVScrollbarComponent,
    ScheduleScheduleRowHeaderComponent,
    ScheduleScheduleSurfaceComponent,
    ScheduleShiftRowHeaderComponent,
    ScheduleShiftSurfaceComponent,
  ],
})
export class ScheduleContainerComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('splitElHorizontal', { static: true })
  splitElHorizontal!: SplitComponent;

  public IsInfoVisible = false;
  public horizontalSizes = 200;
  private ngUnsubscribe = new Subject<void>();

  constructor(
    public dataManagementScheduleService: DataManagementScheduleService,
    private ngZone: NgZone,
    private spinnerService: SpinnerService
  ) {}
  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.readData();
    this.splitElHorizontal.dragProgress$
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => {
        this.ngZone.run(() => (this.horizontalSizes = +x.sizes[0] + 3));
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  private readData() {
    this.dataManagementScheduleService.readDatas();
  }
}

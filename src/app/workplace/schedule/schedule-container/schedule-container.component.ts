import {
  AfterViewInit,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { SplitComponent } from 'angular-split';
import { Subject, takeUntil } from 'rxjs';
import { DataManagementScheduleService } from 'src/app/data/management/data-management-schedule.service';
import { SpinnerService } from 'src/app/spinner/spinner.service';

@Component({
  selector: 'app-schedule-container',
  templateUrl: './schedule-container.component.html',
  styleUrls: ['./schedule-container.component.scss'],
})
export class ScheduleContainerComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('splitElHorizontal', { static: true })
  splitElHorizontal!: SplitComponent;

  public IsInfoVisible = false;
  public horizontalSizes: number = 200;
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

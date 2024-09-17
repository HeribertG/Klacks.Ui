import {
  Component,
  EventEmitter,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { DataManagementSettingsService } from 'src/app/data/management/data-management-settings.service';

@Component({
  selector: 'app-email-setting',
  templateUrl: './email-setting.component.html',
  styleUrls: ['./email-setting.component.scss'],
})
export class EmailSettingComponent implements OnInit {
  @Output() isChangingEvent = new EventEmitter();

  @ViewChild(NgForm, { static: false }) emailSettingsForm: NgForm | undefined;
  ruleName = '';
  showPassword = false;
  keyValueDiffers: any;
  objectForUnsubscribe: any;
  private ngUnsubscribe = new Subject<void>();

  constructor(
    public dataManagementSettingsService: DataManagementSettingsService
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.objectForUnsubscribe = this.emailSettingsForm!.valueChanges!.subscribe(
      (x) => {
        if (this.emailSettingsForm!.dirty) {
          setTimeout(() => this.isChangingEvent.emit(true), 100);
        }
      }
    );

    this.dataManagementSettingsService.isReset
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => {
        setTimeout(() => this.isChangingEvent.emit(false), 100);
      });
  }

  ngOnDestroy(): void {
    this.objectForUnsubscribe.unsubscribe();
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}

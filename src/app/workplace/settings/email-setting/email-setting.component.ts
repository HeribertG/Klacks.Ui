import {
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { IconsModule } from 'src/app/icons/icons.module';
import { SharedModule } from 'src/app/shared/shared.module';
import { SpinnerModule } from 'src/app/spinner/spinner.module';

import { Subject, Subscription } from 'rxjs';
import { DataManagementSettingsService } from 'src/app/data/management/data-management-settings.service';

@Component({
  selector: 'app-email-setting',
  templateUrl: './email-setting.component.html',
  styleUrls: ['./email-setting.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NgbModule,
    IconsModule,
    SharedModule,
    SpinnerModule,
  ],
})
export class EmailSettingComponent implements OnInit, OnDestroy {
  @Output() isChangingEvent = new EventEmitter<boolean>();
  @ViewChild(NgForm, { static: false }) emailSettingsForm: NgForm | undefined;

  ruleName = '';
  showPassword = false;

  private formSubscription?: Subscription;
  private ngUnsubscribe = new Subject<void>();

  public dataManagementSettingsService = inject(DataManagementSettingsService);

  constructor() {}

  ngOnInit(): void {
    this.readSignal();
  }

  ngAfterViewInit(): void {
    if (this.emailSettingsForm?.valueChanges) {
      this.formSubscription = this.emailSettingsForm.valueChanges.subscribe(
        () => {
          if (this.emailSettingsForm?.dirty) {
            setTimeout(() => this.isChangingEvent.emit(true), 100);
          }
        }
      );
    }
  }

  ngOnDestroy(): void {
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }

    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  private readSignal(): void {
    effect(() => {
      const isReset = this.dataManagementSettingsService.isReset();
      if (isReset) {
        setTimeout(() => this.isChangingEvent.emit(false), 100);
      }
    });
  }
}

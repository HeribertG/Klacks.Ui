import {
  Component,
  EffectRef,
  EventEmitter,
  Injector,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  effect,
  inject,
  runInInjectionContext, AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
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
    SharedModule,
    SpinnerModule,
  ],
})
export class EmailSettingComponent implements OnInit, OnDestroy, AfterViewInit {
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  private injector = inject(Injector);

  @Output() isChangingEvent = new EventEmitter<boolean>();
  @ViewChild(NgForm, { static: false }) emailSettingsForm: NgForm | undefined;

  ruleName = '';
  showPassword = false;

  private formSubscription?: Subscription;
  private ngUnsubscribe = new Subject<void>();
  private effects: EffectRef[] = [];

  ngOnInit(): void {
    this.readSignals();
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

    this.effects.forEach((effectRef) => {
      if (effectRef) {
        effectRef.destroy();
      }
    });
    this.effects = [];
  }

  private readSignals(): void {
    const resetEffect = runInInjectionContext(this.injector, () => {
      return effect(() => {
        const isReset = this.dataManagementSettingsService.isReset();
        if (isReset) {
          setTimeout(() => this.isChangingEvent.emit(false), 100);
        }
      });
    });
    this.effects.push(resetEffect);
  }
}

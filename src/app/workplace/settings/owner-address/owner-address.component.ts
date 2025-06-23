import {
  Component,
  EffectRef,
  EventEmitter,
  OnInit,
  Output,
  ViewChild,
  effect,
  inject,
  AfterViewInit,
  OnDestroy,
  runInInjectionContext,
  Injector,
} from '@angular/core';
import { Subject } from 'rxjs';
import { DataManagementSettingsService } from 'src/app/data/management/data-management-settings.service';

import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/spinner/spinner.module';
import { SharedModule } from 'src/app/shared/shared.module';

@Component({
  selector: 'app-owner-address',
  templateUrl: './owner-address.component.html',
  styleUrls: ['./owner-address.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    NgbModule,
    SpinnerModule,
    SharedModule,
  ],
})
export class OwnerAddressComponent implements OnInit, AfterViewInit, OnDestroy {
  @Output() isChangingEvent = new EventEmitter();

  @ViewChild(NgForm, { static: false }) ownerAddressForm: NgForm | undefined;

  public translate = inject(TranslateService);
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  private injector = inject(Injector);

  keyValueDiffers: any;
  objectForUnsubscribe: any;
  private ngUnsubscribe = new Subject<void>();
  private effects: EffectRef[] = [];

  ngOnInit(): void {
    this.readSignals();
  }

  ngAfterViewInit(): void {
    this.objectForUnsubscribe = this.ownerAddressForm!.valueChanges!.subscribe(
      () => {
        if (this.ownerAddressForm!.dirty) {
          setTimeout(() => this.isChangingEvent.emit(true), 100);
        }
      }
    );
  }

  ngOnDestroy(): void {
    this.objectForUnsubscribe.unsubscribe();
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
    runInInjectionContext(this.injector, () => {
      const resetEffect = effect(() => {
        const isReset = this.dataManagementSettingsService.isReset();
        if (isReset) {
          setTimeout(() => this.isChangingEvent.emit(false), 100);
        }
      });
      this.effects.push(resetEffect);
    });
  }
}

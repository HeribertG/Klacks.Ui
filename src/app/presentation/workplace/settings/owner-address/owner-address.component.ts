/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  EffectRef,
  OnInit,
  ViewChild,
  effect,
  inject,
  AfterViewInit,
  OnDestroy,
  runInInjectionContext,
  Injector,
} from '@angular/core';
import { Subject } from 'rxjs';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';


import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';

@Component({
  selector: 'app-owner-address',
  templateUrl: './owner-address.component.html',
  styleUrls: ['./owner-address.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    FormsModule,
    NgbModule,
    SpinnerModule
],
})
export class OwnerAddressComponent implements OnInit, AfterViewInit, OnDestroy {

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
          setTimeout(() => this.dataManagementSettingsService.settingsChangeTrigger.update(v => v + 1), 100);
        }
      }
    );
  }

  ngOnDestroy(): void {
    if (this.objectForUnsubscribe) {
      this.objectForUnsubscribe.unsubscribe();
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
    runInInjectionContext(this.injector, () => {
      const resetEffect = effect(() => {
        const isReset = this.dataManagementSettingsService.isReset();
        if (isReset) {
          // Reset effect - no need to trigger save
        }
      });
      this.effects.push(resetEffect);
    });
  }
}

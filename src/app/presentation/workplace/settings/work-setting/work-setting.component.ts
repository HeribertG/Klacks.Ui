import {
  Component,
  EffectRef,
  Injector,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { DataManagementContractService } from 'src/app/domain/services/contract/data-management-contract.service';

@Component({
  selector: 'app-work-setting',
  templateUrl: './work-setting.component.html',
  styleUrls: ['./work-setting.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule, NgbModule],
})
export class WorkSettingComponent implements OnInit, OnDestroy {
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  private contractService = inject(DataManagementContractService);
  private injector = inject(Injector);

  @ViewChild(NgForm, { static: false }) workSettingsForm: NgForm | undefined;

  public isDataLoaded = false;
  public hasContracts = false;

  private formSubscription?: Subscription;
  private effects: EffectRef[] = [];

  async ngOnInit(): Promise<void> {
    this.readSignals();
    await this.checkContracts();
  }

  private async checkContracts(): Promise<void> {
    if (!this.contractService.isRead()) {
      await this.contractService.readContracts();
    }
    this.hasContracts = this.contractService.contracts.length > 0;
  }

  private setupFormSubscription(): void {
    if (this.workSettingsForm?.valueChanges && !this.formSubscription) {
      this.workSettingsForm.form.markAsPristine();

      this.formSubscription = this.workSettingsForm.valueChanges.subscribe(
        () => {
          if (this.workSettingsForm?.dirty) {
            this.dataManagementSettingsService.settingsChangeTrigger.update(v => v + 1);
          }
        }
      );
    }
  }

  ngOnDestroy(): void {
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }

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
        if (isReset && !this.isDataLoaded) {
          this.isDataLoaded = true;

          setTimeout(() => {
            if (this.workSettingsForm) {
              this.setupFormSubscription();
            }
          }, 100);
        }
      });
    });
    this.effects.push(resetEffect);
  }
}

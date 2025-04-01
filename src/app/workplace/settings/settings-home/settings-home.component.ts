import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/spinner/spinner.module';
import { SharedModule } from 'src/app/shared/shared.module';

// Services
import { DataManagementSettingsService } from 'src/app/data/management/data-management-settings.service';
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { LocalStorageService } from 'src/app/services/local-storage.service';

// Standalone Komponenten
import { SettingsGeneralComponent } from '../settings-general/settings-general.component';
import { OwnerAddressComponent } from '../owner-address/owner-address.component';
import { BankAccountsComponent } from '../bank-accounts/bank-accounts.component';
import { CountriesComponent } from '../countries/countries.component';
import { StateComponent } from '../state/state.component';
import { AbsenceComponent } from '../absence/absence.component';
import { CalendarRulesComponent } from '../calendar-rules/calendar-rules.component';
import { EmailSettingComponent } from '../email-setting/email-setting.component';
import { GridColorComponent } from '../grid-color/grid-color.component';
import { MacrosComponent } from '../macros/macros.component';
import { UserAdministrationComponent } from '../user-administration/user-administration.component';

@Component({
  selector: 'app-settings-home',
  templateUrl: './settings-home.component.html',
  styleUrls: ['./settings-home.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    NgbModule,
    SpinnerModule,
    SharedModule,
    SettingsGeneralComponent,
    OwnerAddressComponent,
    BankAccountsComponent,
    CountriesComponent,
    StateComponent,
    AbsenceComponent,
    CalendarRulesComponent,
    EmailSettingComponent,
    GridColorComponent,
    MacrosComponent,
    UserAdministrationComponent,
  ],
})
export class SettingsHomeComponent implements OnInit {
  @Input() isSetting: boolean = false;
  @Output() isChangingEvent = new EventEmitter();

  public translate = inject(TranslateService);

  private dataManagementSwitchboardService = inject(
    DataManagementSwitchboardService
  );
  private dataManagementSettingsService = inject(DataManagementSettingsService);
  private localStorageService = inject(LocalStorageService);

  get settingsService(): DataManagementSettingsService {
    return this.dataManagementSettingsService;
  }

  get switchboardService(): DataManagementSwitchboardService {
    return this.dataManagementSwitchboardService;
  }

  ngOnInit(): void {
    const id = this.localStorageService.get(MessageLibrary.TOKEN_USERID) + '';
    this.dataManagementSettingsService.CurrentAccountId = id;
    this.dataManagementSwitchboardService.nameOfVisibleEntity =
      'DataManagementSettingsService';
    this.dataManagementSettingsService.readData();
  }

  onIsChanging(event: any): void {
    this.isChangingEvent.emit(event);
  }

  isfocused(value: string): void {}
}

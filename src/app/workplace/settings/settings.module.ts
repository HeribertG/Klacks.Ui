import { NgModule } from '@angular/core';
import { BankAccountsComponent } from './bank-accounts/bank-accounts.component';
import { BankAccountsRowComponent } from './bank-accounts/bank-accounts-row/bank-accounts-row.component';
import { AbsenceComponent } from './absence/absence.component';
import { CalendarRulesComponent } from './calendar-rules/calendar-rules.component';
import { CommonModule } from '@angular/common';
import { CountriesComponent } from './countries/countries.component';
import { CountriesHeaderComponent } from './countries/countries-header/countries-header.component';
import { CountriesRowComponent } from './countries/countries-row/countries-row.component';
import { EmailSettingComponent } from './email-setting/email-setting.component';
import { FormsModule } from '@angular/forms';
import { IconsModule } from 'src/app/icons/icons.module';
import { MacroHeaderComponent } from './macros/macro-header/macro-header.component';
import { MacrosComponent } from './macros/macros.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { OwnerAddressComponent } from './owner-address/owner-address.component';
import { SettingsGeneralComponent } from './settings-general/settings-general.component';
import { SettingsHomeComponent } from './settings-home/settings-home.component';
import { SpinnerModule } from 'src/app/spinner/spinner.module';
import { UserAdministrationComponent } from './user-administration/user-administration.component';
import { UserAdministrationHeaderComponent } from './user-administration/user-administration-header/user-administration-header.component';
import { UserAdministrationRowComponent } from './user-administration/user-administration-row/user-administration-row.component';
import { MacroRowComponent } from './macros/macro-row/macro-row.component';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import { GridColorComponent } from './grid-color/grid-color.component';
import { GridColorHeaderComponent } from './grid-color/grid-color-header/grid-color-header.component';
import { GridColorRowComponent } from './grid-color/grid-color-row/grid-color-row.component';
import { TranslateModule } from '@ngx-translate/core';
import { StateComponent } from './state/state.component';
import { StateHeaderComponent } from './state/state-header/state-header.component';
import { StateRowComponent } from './state/state-row/state-row.component';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  declarations: [
    SettingsHomeComponent,
    BankAccountsComponent,
    BankAccountsRowComponent,
    AbsenceComponent,
    CalendarRulesComponent,
    CountriesComponent,
    CountriesHeaderComponent,
    CountriesRowComponent,
    EmailSettingComponent,
    MacroHeaderComponent,
    MacroRowComponent,
    MacrosComponent,
    OwnerAddressComponent,
    SettingsGeneralComponent,
    UserAdministrationComponent,
    UserAdministrationHeaderComponent,
    UserAdministrationRowComponent,
    GridColorComponent,
    GridColorHeaderComponent,
    GridColorRowComponent,
    StateComponent,
    StateHeaderComponent,
    StateRowComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    IconsModule,
    NgbModule,
    SpinnerModule,
    SharedModule,
    CodemirrorModule,
    TranslateModule,
  ],
  exports: [
    SettingsHomeComponent,
    BankAccountsComponent,
    BankAccountsRowComponent,
    AbsenceComponent,
    CalendarRulesComponent,
    CountriesComponent,
    CountriesHeaderComponent,
    CountriesRowComponent,
    EmailSettingComponent,
    MacroHeaderComponent,
    MacroRowComponent,
    MacrosComponent,
    OwnerAddressComponent,
    SettingsGeneralComponent,
    UserAdministrationComponent,
    UserAdministrationHeaderComponent,
    UserAdministrationRowComponent,
    GridColorHeaderComponent,
    GridColorRowComponent,
  ],
})
export class SettingsModule {}

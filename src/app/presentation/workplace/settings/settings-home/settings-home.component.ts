/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Component, inject, OnInit } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { SettingsGeneralComponent } from '../settings-general/settings-general.component';
import { OwnerAddressComponent } from '../owner-address/owner-address.component';
import { CountriesComponent } from '../countries/countries.component';
import { StateComponent } from '../state/state.component';
import { BranchesComponent } from '../branches/branches.component';
import { AbsenceComponent } from '../absence/absence.component';
import { CalendarRulesComponent } from '../calendar-rules/calendar-rules.component';
import { EmailSettingComponent } from '../email-setting/email-setting.component';
import { GridColorComponent } from '../grid-color/grid-color.component';
import { MacrosComponent } from '../macros/macros.component';
import { UserAdministrationComponent } from '../user-administration/user-administration.component';
import { GroupScopeComponent } from '../group-scope/group-scope.component';
import { ContractsComponent } from '../contracts/contracts.component';
import { LLMModelsComponent } from '../llm-models/llm-models.component';
import { LLMProvidersComponent } from '../llm-providers/llm-providers.component';
import { OpenrouteComponent } from '../openroute/openroute.component';
import { DeeplComponent } from '../deepl/deepl.component';
import { WorkSettingComponent } from '../work-setting/work-setting.component';
import { IdentityProvidersComponent } from '../identity-providers/identity-providers.component';
import { AbsenceDetailComponent } from '../absence-detail/absence-detail.component';

@Component({
  selector: 'app-settings-home',
  templateUrl: './settings-home.component.html',
  styleUrls: ['./settings-home.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    FormsModule,
    NgbModule,
    SpinnerModule,
    SettingsGeneralComponent,
    OwnerAddressComponent,
    CountriesComponent,
    StateComponent,
    BranchesComponent,
    AbsenceComponent,
    CalendarRulesComponent,
    EmailSettingComponent,
    GridColorComponent,
    MacrosComponent,
    UserAdministrationComponent,
    GroupScopeComponent,
    ContractsComponent,
    LLMModelsComponent,
    LLMProvidersComponent,
    OpenrouteComponent,
    DeeplComponent,
    WorkSettingComponent,
    IdentityProvidersComponent,
    AbsenceDetailComponent,
],
})
export class SettingsHomeComponent implements OnInit {
  public translate = inject(TranslateService);

  private workplaceStateService = inject(WorkplaceStateService);
  private dataManagementSettingsService = inject(DataManagementSettingsService);

  private localStorageService = inject(LocalStorageService);
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);

  get settingsService(): DataManagementSettingsService {
    return this.dataManagementSettingsService;
  }

  get switchboardService(): WorkplaceStateService {
    return this.workplaceStateService;
  }

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.searchService.setSearchVisibility(false);

    const id = this.localStorageService.get(MessageLibrary.TOKEN_USERID) + '';
    this.dataManagementSettingsService.CurrentAccountId = id;
    this.workplaceStateService.setActiveManagerByRoute('settings');
    this.savebarService.setSavebarVisibility(false);
    this.dataManagementSettingsService.readData();
  }

  onIsChanging(event: any): void {
    if (event === true) {
      this.workplaceStateService.areObjectsDirty();
    } else {
      this.workplaceStateService.checkIfDirtyIsNecessary();
    }
  }

  isfocused(value: string): void {}
}

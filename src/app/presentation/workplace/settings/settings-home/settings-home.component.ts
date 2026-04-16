// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { FeaturePluginStateService } from 'src/app/application/services/feature-plugin-state.service';
import { MESSAGING_PLUGIN_NAME } from 'src/app/domain/constants/feature-plugin.constants';
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
import { ReportsComponent } from '../reports/reports.component';
import { ReportDefaultsComponent } from '../reports/report-defaults/report-defaults.component';
import { SchedulingRulesComponent } from '../scheduling-rules/scheduling-rules.component';
import { SchedulingDefaultsSettingComponent } from '../scheduling-defaults-setting/scheduling-defaults-setting.component';
import { ImapSettingComponent } from '../imap-setting/imap-setting.component';
import { SpamRulesComponent } from '../spam-rules/spam-rules.component';
import { LanguagePluginsComponent } from '../language-plugins/language-plugins.component';
import { MessagingProvidersComponent, OwnerMessengersComponent } from 'klacks-plugin-messaging';
import { FeaturePluginsComponent } from '../feature-plugins/feature-plugins.component';
import { AssistantSpeechSettingsComponent } from '../assistant-speech-settings/assistant-speech-settings.component';
import { AssistantPersonalitySettingsComponent } from '../assistant-personality-settings/assistant-personality-settings.component';
import { CalendarSelectionComponent } from '../calendar-selection/calendar-selection.component';
import { FloorPlanSettingsComponent } from '../floor-plan-settings/floor-plan-settings.component';
import { DataRetentionSettingComponent } from '../data-retention-setting/data-retention-setting.component';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { IconCollapseAllGreyComponent } from 'src/app/presentation/icons/icon-collapse-all-grey.component';
import { IconExpandAllGreyComponent } from 'src/app/presentation/icons/icon-expand-all-grey.component';

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
    IconAngleDownComponent,
    IconAngleRightComponent,
    IconCollapseAllGreyComponent,
    IconExpandAllGreyComponent,
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
    ReportsComponent,
    ReportDefaultsComponent,
    SchedulingRulesComponent,
    SchedulingDefaultsSettingComponent,
    ImapSettingComponent,
    SpamRulesComponent,
    LanguagePluginsComponent,
    MessagingProvidersComponent,
    OwnerMessengersComponent,
    FeaturePluginsComponent,
    AssistantSpeechSettingsComponent,
    AssistantPersonalitySettingsComponent,
    CalendarSelectionComponent,
    FloorPlanSettingsComponent,
    DataRetentionSettingComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsHomeComponent implements OnInit {

  private workplaceStateService = inject(WorkplaceStateService);
  private dataManagementSettingsService = inject(DataManagementSettingsService);

  private localStorageService = inject(LocalStorageService);
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  public featurePluginState = inject(FeaturePluginStateService);
  public messagingPluginName = MESSAGING_PLUGIN_NAME;

  sections: Record<string, boolean> = {
    general: true,
    users: true,
    organization: true,
    work: true,
    absence: true,
    communication: true,
    appearance: true,
    llm: true,
    klacksy: true,
    externalServices: true,
    plugins: true,
  };

  get settingsService(): DataManagementSettingsService {
    return this.dataManagementSettingsService;
  }

  get switchboardService(): WorkplaceStateService {
    return this.workplaceStateService;
  }

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.searchService.setSearchVisibility(false);

    const id = this.localStorageService.get(StorageKeys.TOKEN_USERID) + '';
    this.dataManagementSettingsService.userAdmin.currentAccountId.set(id);
    this.workplaceStateService.setActiveManagerByRoute('settings');
    this.savebarService.setSavebarVisibility(false);
    this.dataManagementSettingsService.readData();
  }

  toggleSection(section: string): void {
    this.sections[section] = !this.sections[section];
  }

  expandAll(): void {
    Object.keys(this.sections).forEach(key => this.sections[key] = true);
  }

  collapseAll(): void {
    Object.keys(this.sections).forEach(key => this.sections[key] = false);
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

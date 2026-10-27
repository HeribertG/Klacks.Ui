// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-unused-vars */
import { ChangeDetectorRef, Component, ChangeDetectionStrategy, DestroyRef, effect, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { SettingsExpertModeService } from 'src/app/domain/services/settings/settings-expert-mode.service';
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
import { EscalationRosterAdministrationComponent } from '../escalation-roster-administration/escalation-roster-administration.component';
import { GroupScopeComponent } from '../group-scope/group-scope.component';
import { ContractsComponent } from '../contracts/contracts.component';
import { LLMModelsComponent } from '../llm-models/llm-models.component';
import { LLMProvidersComponent } from '../llm-providers/llm-providers.component';
import { LlmSyncLogComponent } from '../llm-sync-log/llm-sync-log.component';
import { KlacksyModelCheckComponent } from '../klacksy-model-check/klacksy-model-check.component';
import { IdentityProvidersComponent } from '../identity-providers/identity-providers.component';
import { ErpDropPointsComponent } from '../erp-drop-points/erp-drop-points.component';
import { AbsenceDetailComponent } from '../absence-detail/absence-detail.component';
import { ReportsComponent } from '../reports/reports.component';
import { ReportDefaultsComponent } from '../reports/report-defaults/report-defaults.component';
import { ImapSettingComponent } from '../imap-setting/imap-setting.component';
import { SpamRulesComponent } from '../spam-rules/spam-rules.component';
import { LanguagePluginsComponent } from '../language-plugins/language-plugins.component';
import { FeaturePluginsComponent } from '../feature-plugins/feature-plugins.component';
import { CalendarSelectionComponent } from '../calendar-selection/calendar-selection.component';
import { DataRetentionSettingComponent } from '../data-retention-setting/data-retention-setting.component';
import { ExportFormatsSettingComponent } from '../export-formats-setting/export-formats-setting.component';
import { ExportFormatOverridesSettingComponent } from '../export-format-overrides-setting/export-format-overrides-setting.component';
import { UpdatesSettingComponent } from '../updates-setting/updates-setting.component';
import { QualificationsComponent } from '../qualifications/qualifications.component';
import { ClientImportCardComponent } from '../client-import-card/client-import-card.component';
import { PersonalAccessTokensComponent } from '../personal-access-tokens/personal-access-tokens.component';
import { IconCollapseAllGreyComponent } from 'src/app/presentation/icons/icon-collapse-all-grey.component';
import { IconExpandAllGreyComponent } from 'src/app/presentation/icons/icon-expand-all-grey.component';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-event-type.enum';
import { KlacksyTargetRequestedEvent } from 'src/app/domain/events/klacksy-target-requested-event.interface';
import { SETTINGS_TARGET_SECTIONS } from './settings-target-sections.constants';
import { SettingsSectionHeaderComponent } from './settings-section-header/settings-section-header.component';
import { SettingsWorkSectionComponent } from './settings-work-section/settings-work-section.component';
import { SettingsComplianceSectionComponent } from './settings-compliance-section/settings-compliance-section.component';
import { SettingsKlacksySectionComponent } from './settings-klacksy-section/settings-klacksy-section.component';
import { SettingsExternalServicesSectionComponent } from './settings-external-services-section/settings-external-services-section.component';
import { SETTINGS_EXPERT_MODE_CARD_TARGETS, SETTINGS_EXPERT_MODE_SECTIONS } from './settings-expert-mode.constants';

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
    IconCollapseAllGreyComponent,
    IconExpandAllGreyComponent,
    SettingsSectionHeaderComponent,
    SettingsWorkSectionComponent,
    SettingsComplianceSectionComponent,
    SettingsKlacksySectionComponent,
    SettingsExternalServicesSectionComponent,
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
    EscalationRosterAdministrationComponent,
    GroupScopeComponent,
    ContractsComponent,
    LLMModelsComponent,
    LLMProvidersComponent,
    LlmSyncLogComponent,
    KlacksyModelCheckComponent,
    IdentityProvidersComponent,
    ErpDropPointsComponent,
    AbsenceDetailComponent,
    ReportsComponent,
    ReportDefaultsComponent,
    ImapSettingComponent,
    SpamRulesComponent,
    LanguagePluginsComponent,
    FeaturePluginsComponent,
    CalendarSelectionComponent,
    DataRetentionSettingComponent,
    ExportFormatsSettingComponent,
    ExportFormatOverridesSettingComponent,
    UpdatesSettingComponent,
    QualificationsComponent,
    ClientImportCardComponent,
    PersonalAccessTokensComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsHomeComponent implements OnInit {

  private workplaceStateService = inject(WorkplaceStateService);
  private dataManagementSettingsService = inject(DataManagementSettingsService);

  private expertModeService = inject(SettingsExpertModeService);
  private onboardingService = inject(OnboardingService);
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  public authorizationService = inject(AuthorizationService);

  private eventBus = inject(EVENT_BUS_TOKEN);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  sections: Record<string, boolean> = {
    general: true,
    users: true,
    organization: true,
    work: true,
    compliance: true,
    absence: true,
    communication: true,
    appearance: true,
    llm: true,
    klacksy: true,
    externalServices: true,
    import: true,
    plugins: true,
    system: true,
  };

  isChecked =
    this.onboardingService.isTourActive() ||
    this.expertModeService.isEnabled();

  get settingsService(): DataManagementSettingsService {
    return this.dataManagementSettingsService;
  }

  get switchboardService(): WorkplaceStateService {
    return this.workplaceStateService;
  }

  constructor() {
    this.eventBus
      .on<KlacksyTargetRequestedEvent>(DomainEventType.KLACKSY_TARGET_REQUESTED)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ target }) => {
        const section = SETTINGS_TARGET_SECTIONS[target];
        if (section) {
          if (SETTINGS_EXPERT_MODE_SECTIONS.has(section) || SETTINGS_EXPERT_MODE_CARD_TARGETS.has(target)) {
            this.setExpertMode(true);
          }
          this.sections[section] = true;
          this.changeDetectorRef.markForCheck();
        }
      });

    effect(() => {
      if (this.onboardingService.isTourActive()) {
        this.setExpertMode(true);
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.searchService.setSearchVisibility(false);

    this.dataManagementSettingsService.userAdmin.refreshCurrentAccountId();
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

  onComplexModeChecked(): void {
    this.setExpertMode(this.isChecked);
  }

  private setExpertMode(enabled: boolean): void {
    this.isChecked = enabled;
    this.expertModeService.setEnabled(enabled);
  }

  onIsChanging(event: boolean): void {
    if (event === true) {
      this.workplaceStateService.areObjectsDirty();
    } else {
      this.workplaceStateService.checkIfDirtyIsNecessary();
    }
  }

  isfocused(value: string): void {}
}

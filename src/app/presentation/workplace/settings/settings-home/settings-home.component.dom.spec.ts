// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { CUSTOM_ELEMENTS_SCHEMA, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { SettingsHomeComponent } from './settings-home.component';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { FeaturePluginStateService } from 'src/app/application/services/feature-plugin-state.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { collectElementIds } from 'src/app/shared/testing/dom-structure.testing';
import { SettingsSectionHeaderComponent } from './settings-section-header/settings-section-header.component';
import { SettingsWorkSectionComponent } from './settings-work-section/settings-work-section.component';
import { SettingsComplianceSectionComponent } from './settings-compliance-section/settings-compliance-section.component';
import { SettingsKlacksySectionComponent } from './settings-klacksy-section/settings-klacksy-section.component';
import { SettingsExternalServicesSectionComponent } from './settings-external-services-section/settings-external-services-section.component';

type KlacksyTargetCard = readonly [string, string, string, string, string, string, string | null];

const SECTION_TITLE_KEYS: readonly string[] = [
  'setting.section.general',
  'setting.section.users',
  'setting.section.organization',
  'setting.section.work',
  'setting.section.compliance',
  'setting.section.absence',
  'setting.section.communication',
  'setting.section.appearance',
  'setting.section.llm',
  'setting.section.klacksy',
  'setting.section.externalServices',
  'setting.section.import',
  'setting.section.plugins',
  'setting.section.system',
];

const HEADLINE_IDS: readonly string[] = [
  'settings-home-container',
  'settings-home-headline',
  'settings-expert-mode-toggle',
  'settings-expert-mode-label',
];

const EXPERT_MODE_IDS: readonly string[] = [
  'settings-home-container',
  'settings-home-headline',
  'settings-expert-mode-toggle',
  'settings-expert-mode-label',
  'settings-home-general-row',
  'settings-general',
  'settings-home-owner-row',
  'settings-owner-address',
  'settings-home-data-retention-row',
  'settings-data-retention',
  'settings-export-formats',
  'settings-home-export-format-overrides-row',
  'settings-export-format-overrides',
  'settings-home-user-admin-row',
  'settings-user-administration',
  'settings-home-group-escalation-row',
  'settings-group-scope',
  'settings-escalation-roster',
  'settings-home-branches-contracts-row',
  'settings-branches',
  'settings-contracts',
  'settings-home-state-countries-row',
  'settings-state',
  'settings-countries',
  'settings-home-qualifications-row',
  'settings-qualifications',
  'settings-identity-providers',
  'settings-home-work-row',
  'settings-work-setting',
  'settings-home-scheduling-defaults-row',
  'settings-scheduling-defaults',
  'settings-home-scheduling-rules-row',
  'settings-scheduling-rules',
  'settings-wizard',
  'settings-home-individual-periods-row',
  'settings-individual-periods',
  'settings-monthly-target-hours',
  'settings-home-active-industries-row',
  'settings-active-industries',
  'settings-home-compensatory-rest-row',
  'settings-compensatory-rest',
  'settings-home-surcharge-mode-row',
  'settings-surcharge-mode',
  'settings-home-overtime-row',
  'settings-overtime',
  'settings-home-compliance-enforcement-row',
  'settings-compliance-enforcement',
  'settings-home-counter-rules-row',
  'settings-counter-rules',
  'settings-home-period-cap-rules-row',
  'settings-period-cap-rules',
  'settings-home-restricted-time-window-rules-row',
  'settings-restricted-time-window-rules',
  'settings-home-holiday-work-exemptions-row',
  'settings-holiday-work-exemptions',
  'settings-home-absence-row',
  'settings-absence',
  'settings-home-absence-detail-row',
  'settings-absence-detail',
  'settings-home-calendar-row',
  'settings-calendar-rules',
  'settings-home-calendar-selection-row',
  'settings-calendar-selection',
  'settings-home-email-row',
  'settings-email-setting',
  'settings-home-imap-row',
  'settings-imap-setting',
  'settings-home-spam-rules-row',
  'settings-spam-rules',
  'settings-home-reports-row',
  'settings-reports',
  'settings-report-defaults',
  'settings-home-grid-macros-row',
  'settings-grid-color',
  'settings-macros',
  'settings-home-llm-row',
  'settings-llm-models',
  'settings-llm-providers',
  'settings-home-llm-row2',
  'settings-llm-sync-log',
  'settings-home-llm-row3',
  'settings-klacksy-model-check',
  'settings-home-assistant-speech-row',
  'settings-assistant-speech',
  'settings-home-whisper-plugin-row',
  'settings-whisper-plugin',
  'settings-home-assistant-personality-row',
  'settings-assistant-personality',
  'settings-home-assistant-learning-row',
  'settings-assistant-learning',
  'settings-home-assistant-skill-relations-row',
  'settings-assistant-skill-relations',
  'settings-home-klacksy-autonomy-row',
  'settings-klacksy-autonomy',
  'settings-home-klacksy-proactive-governance-row',
  'settings-klacksy-proactive-governance',
  'settings-home-openroute-deepl-row',
  'settings-openroute',
  'settings-deepl',
  'settings-home-geo-services-row',
  'settings-geo-services-status',
  'settings-home-web-search-row',
  'settings-web-search',
  'settings-home-messaging-providers-row',
  'settings-messaging-providers',
  'settings-home-owner-messengers-row',
  'settings-owner-messengers',
  'settings-home-client-import-row',
  'settings-client-import',
  'settings-home-erp-drop-points-row',
  'settings-erp-drop-points',
  'settings-home-language-plugins-row',
  'settings-language-plugins',
  'settings-home-feature-plugins-row',
  'settings-feature-plugins',
  'settings-home-updates-row',
  'settings-updates',
  'settings-home-personal-access-tokens-row',
  'settings-personal-access-tokens',
];

const BASIC_MODE_IDS: readonly string[] = [
  'settings-home-container',
  'settings-home-headline',
  'settings-expert-mode-toggle',
  'settings-expert-mode-label',
  'settings-home-general-row',
  'settings-general',
  'settings-home-owner-row',
  'settings-owner-address',
  'settings-home-user-admin-row',
  'settings-user-administration',
  'settings-home-group-escalation-row',
  'settings-group-scope',
  'settings-escalation-roster',
  'settings-home-branches-contracts-row',
  'settings-branches',
  'settings-contracts',
  'settings-home-state-countries-row',
  'settings-state',
  'settings-countries',
  'settings-home-qualifications-row',
  'settings-qualifications',
  'settings-home-absence-row',
  'settings-absence',
  'settings-home-absence-detail-row',
  'settings-absence-detail',
  'settings-home-calendar-row',
  'settings-calendar-rules',
  'settings-home-calendar-selection-row',
  'settings-calendar-selection',
  'settings-home-spam-rules-row',
  'settings-spam-rules',
  'settings-home-reports-row',
  'settings-reports',
  'settings-report-defaults',
  'settings-home-grid-macros-row',
  'settings-grid-color',
  'settings-macros',
];

const NON_ADMIN_WITHOUT_MESSAGING_IDS: readonly string[] = [
  'settings-home-container',
  'settings-home-headline',
  'settings-expert-mode-toggle',
  'settings-expert-mode-label',
  'settings-home-general-row',
  'settings-general',
  'settings-home-owner-row',
  'settings-owner-address',
  'settings-home-data-retention-row',
  'settings-data-retention',
  'settings-export-formats',
  'settings-home-export-format-overrides-row',
  'settings-export-format-overrides',
  'settings-home-user-admin-row',
  'settings-user-administration',
  'settings-home-group-escalation-row',
  'settings-group-scope',
  'settings-escalation-roster',
  'settings-home-branches-contracts-row',
  'settings-branches',
  'settings-contracts',
  'settings-home-state-countries-row',
  'settings-state',
  'settings-countries',
  'settings-home-qualifications-row',
  'settings-qualifications',
  'settings-identity-providers',
  'settings-home-work-row',
  'settings-work-setting',
  'settings-home-scheduling-defaults-row',
  'settings-scheduling-defaults',
  'settings-home-scheduling-rules-row',
  'settings-scheduling-rules',
  'settings-wizard',
  'settings-home-individual-periods-row',
  'settings-individual-periods',
  'settings-monthly-target-hours',
  'settings-home-active-industries-row',
  'settings-active-industries',
  'settings-home-compensatory-rest-row',
  'settings-compensatory-rest',
  'settings-home-surcharge-mode-row',
  'settings-surcharge-mode',
  'settings-home-overtime-row',
  'settings-overtime',
  'settings-home-compliance-enforcement-row',
  'settings-compliance-enforcement',
  'settings-home-counter-rules-row',
  'settings-counter-rules',
  'settings-home-period-cap-rules-row',
  'settings-period-cap-rules',
  'settings-home-restricted-time-window-rules-row',
  'settings-restricted-time-window-rules',
  'settings-home-holiday-work-exemptions-row',
  'settings-holiday-work-exemptions',
  'settings-home-absence-row',
  'settings-absence',
  'settings-home-absence-detail-row',
  'settings-absence-detail',
  'settings-home-calendar-row',
  'settings-calendar-rules',
  'settings-home-calendar-selection-row',
  'settings-calendar-selection',
  'settings-home-email-row',
  'settings-email-setting',
  'settings-home-imap-row',
  'settings-imap-setting',
  'settings-home-spam-rules-row',
  'settings-spam-rules',
  'settings-home-reports-row',
  'settings-reports',
  'settings-report-defaults',
  'settings-home-grid-macros-row',
  'settings-grid-color',
  'settings-macros',
  'settings-home-llm-row',
  'settings-llm-models',
  'settings-llm-providers',
  'settings-home-llm-row2',
  'settings-llm-sync-log',
  'settings-home-llm-row3',
  'settings-klacksy-model-check',
  'settings-home-assistant-speech-row',
  'settings-assistant-speech',
  'settings-home-whisper-plugin-row',
  'settings-whisper-plugin',
  'settings-home-assistant-personality-row',
  'settings-assistant-personality',
  'settings-home-assistant-learning-row',
  'settings-assistant-learning',
  'settings-home-assistant-skill-relations-row',
  'settings-assistant-skill-relations',
  'settings-home-klacksy-autonomy-row',
  'settings-klacksy-autonomy',
  'settings-home-klacksy-proactive-governance-row',
  'settings-klacksy-proactive-governance',
  'settings-home-openroute-deepl-row',
  'settings-openroute',
  'settings-deepl',
  'settings-home-web-search-row',
  'settings-web-search',
  'settings-home-erp-drop-points-row',
  'settings-erp-drop-points',
  'settings-home-language-plugins-row',
  'settings-language-plugins',
  'settings-home-feature-plugins-row',
  'settings-feature-plugins',
  'settings-home-updates-row',
  'settings-updates',
  'settings-home-personal-access-tokens-row',
  'settings-personal-access-tokens',
];

const KLACKSY_TARGET_CARDS: readonly KlacksyTargetCard[] = [
  ['settings-general', 'border-bottom-card border-right-card container-profile first', 'settings-general', 'settings.general', 'settings.general', '/workplace/settings', null],
  ['settings-owner-address', 'border-bottom-card border-right-card container-owner-address container-profile first', 'owner-address', 'settings.ownerAddress', 'settings.general', '/workplace/settings', null],
  ['settings-data-retention', 'border-bottom-card border-right-card container-setting-small first', 'data-retention', 'settings.dataRetention', 'settings.admin', '/workplace/settings', null],
  ['settings-export-formats', 'border-bottom-card border-right-card container-setting-small', 'export-formats', 'settings.exportFormats', 'settings.admin', '/workplace/settings', null],
  ['settings-export-format-overrides', 'border-bottom-card border-right-card container-setting-small first', 'export-format-overrides', 'settings.exportFormatOverrides', 'settings.admin', '/workplace/settings', null],
  ['settings-user-administration', 'border-bottom-card border-right-card container-profile container-setting-user-administration first', 'user-management', 'settings.userManagement', 'settings.admin', '/workplace/settings', null],
  ['settings-group-scope', 'border-bottom-card border-right-card container-setting-small first', 'group-scope', 'settings.groupScope', 'settings.organization', '/workplace/settings', null],
  ['settings-escalation-roster', 'border-bottom-card border-right-card container-setting-small', 'escalation-roster', 'settings.escalationRoster', 'settings.admin', '/workplace/settings', null],
  ['settings-branches', 'border-bottom-card border-right-card container-setting-small first', 'branches', 'settings.branches', 'settings.organization', '/workplace/settings', null],
  ['settings-contracts', 'border-bottom-card border-right-card container-setting-small', 'contracts', 'settings.contracts', 'settings.scheduling', '/workplace/settings', null],
  ['settings-state', 'border-bottom-card border-right-card container-setting-small first', 'states', 'settings.states', 'settings.geography', '/workplace/settings', null],
  ['settings-countries', 'border-bottom-card container-setting-small', 'countries', 'settings.countries', 'settings.geography', '/workplace/settings', null],
  ['settings-qualifications', 'border-bottom-card border-right-card container-setting-small first', 'qualifications', 'settings.qualifications', 'settings.organization', '/workplace/settings', null],
  ['settings-identity-providers', 'border-bottom-card container-setting-small', 'identity-providers', 'settings.identityProviders', 'settings.admin', '/workplace/settings', null],
  ['settings-work-setting', 'border-bottom-card border-right-card container-profile container-setting-user-administration first', 'work-setting', 'settings.workSetting', 'settings.scheduling', '/workplace/settings', null],
  ['settings-scheduling-defaults', 'border-bottom-card border-right-card container-profile container-setting-user-administration first', 'scheduling-defaults', 'settings.schedulingDefaults', 'settings.scheduling', '/workplace/settings', null],
  ['settings-scheduling-rules', 'border-bottom-card border-right-card container-setting-small first', 'scheduling-rules', 'settings.schedulingRules', 'settings.scheduling', '/workplace/settings', null],
  ['settings-wizard', 'border-bottom-card container-setting-small', 'wizard', 'setting.holisticHarmonizer.menu', 'settings.scheduling', '/workplace/settings', null],
  ['settings-individual-periods', 'border-bottom-card border-right-card container-setting-small first', 'individual-periods', 'settings.individualPeriods', 'settings.scheduling', '/workplace/settings', null],
  ['settings-monthly-target-hours', 'border-bottom-card border-right-card container-setting-small', 'monthly-target-hours', 'settings.monthlyTargetHours', 'settings.scheduling', '/workplace/settings', null],
  ['settings-active-industries', 'border-bottom-card border-right-card container-profile first', 'active-industries', 'settings.activeIndustries', 'settings.scheduling', '/workplace/settings', null],
  ['settings-compensatory-rest', 'border-bottom-card border-right-card container-profile first', 'compensatory-rest', 'settings.compensatoryRest', 'settings.scheduling', '/workplace/settings', null],
  ['settings-surcharge-mode', 'border-bottom-card border-right-card container-profile first', 'surcharge-mode', 'settings.surchargeMode', 'settings.scheduling', '/workplace/settings', null],
  ['settings-overtime', 'border-bottom-card border-right-card container-profile first', 'overtime', 'settings.overtime', 'settings.scheduling', '/workplace/settings', null],
  ['settings-compliance-enforcement', 'border-bottom-card border-right-card container-profile first', 'compliance-enforcement', 'settings.complianceEnforcement', 'settings.scheduling', '/workplace/settings', null],
  ['settings-counter-rules', 'border-bottom-card border-right-card container-profile first', 'counter-rules', 'settings.counterRule', 'settings.scheduling', '/workplace/settings', null],
  ['settings-period-cap-rules', 'border-bottom-card border-right-card container-profile first', 'period-cap-rules', 'settings.periodCapRule', 'settings.scheduling', '/workplace/settings', null],
  ['settings-restricted-time-window-rules', 'border-bottom-card border-right-card container-profile first', 'restricted-time-window-rules', 'settings.restrictedTimeWindowRule', 'settings.scheduling', '/workplace/settings', null],
  ['settings-holiday-work-exemptions', 'border-bottom-card border-right-card container-profile first', 'holiday-work-exemptions', 'settings.holidayWorkExemption', 'settings.scheduling', '/workplace/settings', null],
  ['settings-absence', 'border-bottom-card border-right-card container-profile container-profile-bank-account first', 'absence-types', 'settings.absence', 'settings.scheduling', '/workplace/settings', null],
  ['settings-absence-detail', 'border-bottom-card border-right-card container-setting-small first', 'absence-detail', 'settings.absenceDetail', 'settings.scheduling', '/workplace/settings', null],
  ['settings-calendar-rules', 'border-bottom-card border-right-card container-profile container-setting-user-administration first', 'calendar-rules', 'settings.calendarRules', 'settings.scheduling', '/workplace/settings', null],
  ['settings-calendar-selection', 'border-bottom-card border-right-card container-setting-small first', 'calendar-selection', 'settings.calendarSelection', 'settings.scheduling', '/workplace/settings', null],
  ['settings-email-setting', 'border-bottom-card border-right-card container-profile container-setting-user-administration first', 'email-config', 'settings.email', 'settings.admin', '/workplace/settings', null],
  ['settings-imap-setting', 'border-bottom-card border-right-card container-profile container-setting-user-administration first', 'imap-setting', 'settings.imap', 'settings.integrations', '/workplace/settings', null],
  ['settings-spam-rules', 'border-bottom-card border-right-card container-profile container-setting-user-administration first', 'spam-rules', 'settings.spamRules', 'settings.admin', '/workplace/settings', null],
  ['settings-reports', 'border-bottom-card border-right-card container-setting-small first', 'reports', 'settings.reports', 'settings.reports', '/workplace/settings', null],
  ['settings-report-defaults', 'border-bottom-card border-right-card container-setting-small', 'report-defaults', 'settings.reportDefaults', 'settings.reports', '/workplace/settings', null],
  ['settings-grid-color', 'border-bottom-card border-right-card container-setting-small first', 'grid-color', 'settings.gridColor', 'settings.ui', '/workplace/settings', null],
  ['settings-macros', 'border-bottom-card border-right-card container-setting-small', 'macros', 'settings.macros', 'settings.ui', '/workplace/settings', null],
  ['settings-llm-models', 'border-bottom-card border-right-card container-setting-small first', 'llm-models', 'settings.llmModels', 'settings.ai', '/workplace/settings', null],
  ['settings-llm-providers', 'border-bottom-card container-setting-small', 'llm-provider', 'settings.llmProvider', 'settings.ai', '/workplace/settings', null],
  ['settings-llm-sync-log', 'border-bottom-card container-profile first', 'llm-sync-log', 'settings.llmSyncLog', 'settings.ai', '/workplace/settings', null],
  ['settings-klacksy-model-check', 'border-bottom-card container-profile first', 'klacksy-model-check', 'settings.klacksyModelCheck', 'settings.ai', '/workplace/settings', null],
  ['settings-assistant-speech', 'border-bottom-card border-right-card container-profile container-setting-user-administration first', 'assistant-speech', 'settings.assistantSpeech', 'settings.ai', '/workplace/settings', null],
  ['settings-whisper-plugin', 'border-bottom-card border-right-card container-profile container-setting-user-administration first', 'whisper-plugin', 'settings.whisperPlugin', 'settings.ai', '/workplace/settings', null],
  ['settings-assistant-personality', 'border-bottom-card border-right-card container-profile container-setting-user-administration first', 'assistant-personality', 'settings.assistantPersonality', 'settings.ai', '/workplace/settings', null],
  ['settings-assistant-learning', 'border-bottom-card border-right-card container-profile container-setting-user-administration first', 'assistant-learning', 'settings.assistantLearning', 'settings.ai', '/workplace/settings', null],
  ['settings-assistant-skill-relations', 'border-bottom-card border-right-card container-profile container-setting-user-administration first', 'assistant-skill-relations', 'settings.assistantSkillRelations', 'settings.ai', '/workplace/settings', null],
  ['settings-klacksy-autonomy', 'border-bottom-card border-right-card container-profile container-setting-user-administration first', 'klacksy-autonomy', 'settings.klacksyAutonomy', 'settings.ai', '/workplace/settings', null],
  ['settings-klacksy-proactive-governance', 'border-bottom-card border-right-card container-profile container-setting-user-administration first', 'klacksy-proactive-governance', 'settings.klacksyProactiveGovernance', 'settings.ai', '/workplace/settings', null],
  ['settings-openroute', 'border-bottom-card border-right-card container-setting-small first', 'openroute', 'settings.openroute', 'settings.integrations', '/workplace/settings', null],
  ['settings-deepl', 'border-bottom-card border-right-card container-setting-small', 'deepl', 'settings.deepl', 'settings.integrations', '/workplace/settings', null],
  ['settings-web-search', 'border-bottom-card border-right-card container-setting-small first', 'web-search', 'settings.web-search', 'settings.integrations', '/workplace/settings', null],
  ['settings-messaging-providers', 'border-bottom-card border-right-card container-profile first', 'messaging-providers', 'settings.messagingProviders', 'settings.integrations', '/workplace/settings', null],
  ['settings-owner-messengers', 'border-bottom-card border-right-card container-profile first', 'owner-messengers', 'settings.ownerMessengers', 'settings.integrations', '/workplace/settings', null],
  ['settings-client-import', 'border-bottom-card border-right-card container-profile first', 'client-import', 'clientImport.title', 'settings.integrations', '/workplace/settings', 'Admin'],
  ['settings-erp-drop-points', 'border-bottom-card border-right-card container-profile first', 'erp-drop-points', 'settings.erpDropPoints', 'settings.integrations', '/workplace/settings', null],
  ['settings-language-plugins', 'border-bottom-card border-right-card container-profile first', 'language-plugins', 'settings.languagePlugins', 'settings.admin', '/workplace/settings', null],
  ['settings-feature-plugins', 'border-bottom-card border-right-card container-profile first', 'feature-plugins', 'settings.featurePlugins', 'settings.admin', '/workplace/settings', null],
  ['settings-updates', 'border-bottom-card border-right-card container-profile container-setting-user-administration first', 'updates', 'settings.updates.title', 'settings.admin', '/workplace/settings', null],
  ['settings-personal-access-tokens', 'border-bottom-card border-right-card container-profile first', 'personal-access-tokens', 'settings.personalAccessTokens', 'settings.admin', '/workplace/settings', null],
];

describe('SettingsHomeComponent (DOM characterization)', () => {
  let fixture: ComponentFixture<SettingsHomeComponent>;
  let expertModeStored: string;
  let isAdmin: boolean;
  let pluginEnabled: WritableSignal<boolean>;

  const render = (prepare?: (component: SettingsHomeComponent) => void): HTMLElement => {
    fixture = TestBed.createComponent(SettingsHomeComponent);
    prepare?.(fixture.componentInstance);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  const sectionHeaders = (root: HTMLElement): HTMLElement[] =>
    Array.from(root.querySelectorAll<HTMLElement>('.section-header'));

  const describeTargetCards = (root: HTMLElement): KlacksyTargetCard[] =>
    Array.from(root.querySelectorAll<HTMLElement>('[id][data-klacksy-target]')).map((card) => [
      card.id,
      Array.from(card.classList).sort().join(' '),
      card.getAttribute('data-klacksy-target') ?? '',
      card.getAttribute('data-klacksy-label-key') ?? '',
      card.getAttribute('data-klacksy-category') ?? '',
      card.getAttribute('data-klacksy-route') ?? '',
      card.getAttribute('data-klacksy-required-permission'),
    ]);

  beforeEach(async () => {
    expertModeStored = 'true';
    isAdmin = true;
    pluginEnabled = signal(true);

    await TestBed.configureTestingModule({
      imports: [SettingsHomeComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: DataManagementSettingsService,
          useValue: { userAdmin: { refreshCurrentAccountId: vi.fn() }, readData: vi.fn() },
        },
        { provide: WorkplaceStateService, useValue: { setActiveManagerByRoute: vi.fn() } },
        { provide: LocalStorageService, useValue: { get: vi.fn(() => expertModeStored), set: vi.fn() } },
        { provide: SavebarService, useValue: { setSavebarVisibility: vi.fn() } },
        { provide: FeaturePluginStateService, useValue: { isPluginEnabled: vi.fn(() => pluginEnabled()) } },
        {
          provide: AuthorizationService,
          useValue: {
            get isAdmin() {
              return isAdmin;
            },
          },
        },
        { provide: LayoutService, useValue: { setContainerToNormalSize: vi.fn() } },
        { provide: SearchService, useValue: { setSearchVisibility: vi.fn() } },
        {
          provide: EVENT_BUS_TOKEN,
          useValue: { emit: vi.fn(), on: vi.fn(() => new Subject()), onAny: vi.fn(() => new Subject()) },
        },
        { provide: OnboardingService, useValue: { isTourActive: () => false } },
      ],
    })
      .overrideComponent(SettingsHomeComponent, {
        set: {
          imports: [
            TranslateModule,
            FormsModule,
            SettingsSectionHeaderComponent,
            SettingsWorkSectionComponent,
            SettingsComplianceSectionComponent,
            SettingsKlacksySectionComponent,
            SettingsExternalServicesSectionComponent,
          ],
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
        },
      })
      .overrideComponent(SettingsSectionHeaderComponent, {
        set: { imports: [TranslateModule], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
      })
      .overrideComponent(SettingsWorkSectionComponent, { set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] } })
      .overrideComponent(SettingsComplianceSectionComponent, { set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] } })
      .overrideComponent(SettingsKlacksySectionComponent, { set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] } })
      .overrideComponent(SettingsExternalServicesSectionComponent, { set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] } })
      .compileComponents();
  });

  it('renders every row and card of all sections in expert mode in the original order', () => {
    const root = render();

    expect(collectElementIds(root)).toEqual(EXPERT_MODE_IDS);
  });

  it('keeps id, classes and Klacksy navigation attributes of every card', () => {
    const root = render();

    expect(describeTargetCards(root)).toEqual(KLACKSY_TARGET_CARDS);
  });

  it('renders the fourteen section headers with their title, arrow and keyboard access', () => {
    const root = render();
    const headers = sectionHeaders(root);

    expect(headers.map((header) => header.textContent?.trim())).toEqual(SECTION_TITLE_KEYS);
    headers.forEach((header) => {
      expect(Array.from(header.classList).sort()).toEqual(['first', 'section-header']);
      expect(header.getAttribute('tabindex')).toBe('0');
      expect(header.getAttribute('role')).toBe('button');
      expect(header.querySelector('button.section-toggle-button app-icon-angle-down')).not.toBeNull();
    });
  });

  it('hides the expert-only sections and cards outside expert mode', () => {
    expertModeStored = 'false';

    const root = render();

    expect(collectElementIds(root)).toEqual(BASIC_MODE_IDS);
    expect(sectionHeaders(root).map((header) => header.textContent?.trim())).toEqual([
      'setting.section.general',
      'setting.section.users',
      'setting.section.organization',
      'setting.section.absence',
      'setting.section.communication',
      'setting.section.appearance',
    ]);
  });

  it('hides the admin-only cards and the messaging cards for a non-admin without the messaging plugin', () => {
    isAdmin = false;
    pluginEnabled.set(false);

    const root = render();

    expect(collectElementIds(root)).toEqual(NON_ADMIN_WITHOUT_MESSAGING_IDS);
  });

  it('keeps only the headline and the collapsed section headers when every section is collapsed', () => {
    const root = render((component) => component.collapseAll());

    expect(collectElementIds(root)).toEqual(HEADLINE_IDS);
    expect(sectionHeaders(root).length).toBe(SECTION_TITLE_KEYS.length);
    sectionHeaders(root).forEach((header) => {
      expect(header.querySelector('app-icon-angle-down')).toBeNull();
      expect(header.querySelector('app-icon-angle-right')).not.toBeNull();
    });
  });

  it('collapses a section on a header click and expands it again on Enter', () => {
    const root = render();
    const complianceIndex = SECTION_TITLE_KEYS.indexOf('setting.section.compliance');

    sectionHeaders(root)[complianceIndex].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.sections['compliance']).toBe(false);
    expect(root.querySelector('#settings-counter-rules')).toBeNull();
    expect(root.querySelector('#settings-absence')).not.toBeNull();

    sectionHeaders(root)[complianceIndex].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.sections['compliance']).toBe(true);
    expect(root.querySelector('#settings-counter-rules')).not.toBeNull();
  });

  it('toggles a section once when its arrow button is clicked', () => {
    const root = render();

    (sectionHeaders(root)[0].querySelector('.section-toggle-button') as HTMLElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.sections['general']).toBe(false);
    expect(root.querySelector('#settings-general')).toBeNull();
  });
});

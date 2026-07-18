// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card for compliance enforcement and roster publication rules.
 * Edits the global default enforcement mode, the supervisor-override flag,
 * a tri-state per-rule mode for each of the eleven compliance rules
 * (empty string = inherit the default, otherwise warn or block) and the
 * roster publication lead-time settings.
 * @param dataManagementSettingsService - Facade exposing the complianceEnforcementSettings signal and change triggers.
 */

import {
  Component,
  ChangeDetectionStrategy,
  OnDestroy,
  OnInit,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import {
  ComplianceEnforcementDefaultMode,
  ComplianceEnforcementRuleMode,
} from 'src/app/domain/models/settings/app-settings.model';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { DomainMessages } from 'src/app/domain/constants/messages';

const MIN_LEAD_DAYS = 0;
const COMPLIANCE_ENFORCEMENT_MANUAL_NAME = 'compliance-enforcement-manual';

type SettingsTab = 'settings' | 'manual';

interface ComplianceEnforcementFormModel {
  enforcementDefaultMode: ComplianceEnforcementDefaultMode;
  enforcementAllowSupervisorOverride: boolean;
  enforcementMaxDailyHours: ComplianceEnforcementRuleMode;
  enforcementMaxWeeklyHours: ComplianceEnforcementRuleMode;
  enforcementMinRestHours: ComplianceEnforcementRuleMode;
  enforcementMinRestDays: ComplianceEnforcementRuleMode;
  enforcementMaxConsecutiveDays: ComplianceEnforcementRuleMode;
  enforcementPeriodCap: ComplianceEnforcementRuleMode;
  enforcementRollingAverage: ComplianceEnforcementRuleMode;
  enforcementRestDayRotation: ComplianceEnforcementRuleMode;
  enforcementCounterRule: ComplianceEnforcementRuleMode;
  enforcementCompensatoryRest: ComplianceEnforcementRuleMode;
  enforcementRestrictedTimeWindow: ComplianceEnforcementRuleMode;
  rosterPublicationMinLeadDays: number;
  rosterPublicationCountWorkdaysOnly: boolean;
}

@Component({
  selector: 'app-compliance-enforcement-settings',
  templateUrl: './compliance-enforcement-settings.component.html',
  styleUrls: ['./compliance-enforcement-settings.component.scss'],
  standalone: true,
  imports: [FormsModule, FormField, TranslateModule, NgbModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComplianceEnforcementSettingsComponent implements OnInit, OnDestroy {
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  private translate = inject(TranslateService);
  private manualLoader = inject(ManualLoaderService);

  private destroy$ = new Subject<void>();

  public isDataLoaded = false;

  public readonly activeTab = signal<SettingsTab>('settings');
  public readonly manualContent = signal<string>('');

  public formModel = signal<ComplianceEnforcementFormModel>({
    enforcementDefaultMode: 'warn',
    enforcementAllowSupervisorOverride: true,
    enforcementMaxDailyHours: '',
    enforcementMaxWeeklyHours: '',
    enforcementMinRestHours: '',
    enforcementMinRestDays: '',
    enforcementMaxConsecutiveDays: '',
    enforcementPeriodCap: '',
    enforcementRollingAverage: '',
    enforcementRestDayRotation: '',
    enforcementCounterRule: '',
    enforcementCompensatoryRest: '',
    enforcementRestrictedTimeWindow: '',
    rosterPublicationMinLeadDays: 0,
    rosterPublicationCountWorkdaysOnly: false,
  });

  complianceForm = form(this.formModel);

  constructor() {
    effect(() => {
      const isReset = this.dataManagementSettingsService.isReset();
      if (isReset && !this.isDataLoaded) {
        this.loadFromService();
        this.isDataLoaded = true;
      }
    });

    effect(() => {
      const data = this.formModel();
      if (this.isDataLoaded) {
        this.syncToService(data);
      }
    });
  }

  ngOnInit(): void {
    if (!this.isDataLoaded) {
      this.loadFromService();
      this.isDataLoaded = true;
    }

    this.loadManual();
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadManual());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
  }

  private loadManual(): void {
    const lang = this.translate.currentLang || DomainMessages.DEFAULT_LANG;
    this.manualLoader
      .loadManual(COMPLIANCE_ENFORCEMENT_MANUAL_NAME, lang)
      .pipe(takeUntil(this.destroy$))
      .subscribe(content => this.manualContent.set(content));
  }

  private loadFromService(): void {
    const svc = this.dataManagementSettingsService;
    const compliance = svc.appSettings.complianceEnforcementSettings();
    this.formModel.set({
      enforcementDefaultMode: compliance.enforcementDefaultMode,
      enforcementAllowSupervisorOverride: compliance.enforcementAllowSupervisorOverride,
      enforcementMaxDailyHours: compliance.enforcementMaxDailyHours,
      enforcementMaxWeeklyHours: compliance.enforcementMaxWeeklyHours,
      enforcementMinRestHours: compliance.enforcementMinRestHours,
      enforcementMinRestDays: compliance.enforcementMinRestDays,
      enforcementMaxConsecutiveDays: compliance.enforcementMaxConsecutiveDays,
      enforcementPeriodCap: compliance.enforcementPeriodCap,
      enforcementRollingAverage: compliance.enforcementRollingAverage,
      enforcementRestDayRotation: compliance.enforcementRestDayRotation,
      enforcementCounterRule: compliance.enforcementCounterRule,
      enforcementCompensatoryRest: compliance.enforcementCompensatoryRest,
      enforcementRestrictedTimeWindow: compliance.enforcementRestrictedTimeWindow,
      rosterPublicationMinLeadDays: compliance.rosterPublicationMinLeadDays,
      rosterPublicationCountWorkdaysOnly: compliance.rosterPublicationCountWorkdaysOnly,
    });
  }

  private syncToService(data: ComplianceEnforcementFormModel): void {
    const svc = this.dataManagementSettingsService;
    svc.appSettings.complianceEnforcementSettings.update(s => ({
      ...s,
      enforcementDefaultMode: data.enforcementDefaultMode,
      enforcementAllowSupervisorOverride: data.enforcementAllowSupervisorOverride,
      enforcementMaxDailyHours: data.enforcementMaxDailyHours,
      enforcementMaxWeeklyHours: data.enforcementMaxWeeklyHours,
      enforcementMinRestHours: data.enforcementMinRestHours,
      enforcementMinRestDays: data.enforcementMinRestDays,
      enforcementMaxConsecutiveDays: data.enforcementMaxConsecutiveDays,
      enforcementPeriodCap: data.enforcementPeriodCap,
      enforcementRollingAverage: data.enforcementRollingAverage,
      enforcementRestDayRotation: data.enforcementRestDayRotation,
      enforcementCounterRule: data.enforcementCounterRule,
      enforcementCompensatoryRest: data.enforcementCompensatoryRest,
      enforcementRestrictedTimeWindow: data.enforcementRestrictedTimeWindow,
      rosterPublicationMinLeadDays: clampLeadDays(data.rosterPublicationMinLeadDays),
      rosterPublicationCountWorkdaysOnly: data.rosterPublicationCountWorkdaysOnly,
    }));
    svc.settingsChangeTrigger.update(v => v + 1);
  }
}

function clampLeadDays(value: number): number {
  if (Number.isNaN(value)) {
    return MIN_LEAD_DAYS;
  }
  return Math.max(MIN_LEAD_DAYS, value);
}

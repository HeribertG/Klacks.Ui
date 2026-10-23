// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Compliance section of the expert settings page: the rows with the industry, compensatory-rest, surcharge, overtime,
 * enforcement, counter-rule, period-cap, restricted-time-window and holiday-work-exemption cards.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActiveIndustriesSettingsComponent } from '../../active-industries-settings/active-industries-settings.component';
import { CompensatoryRestSettingsComponent } from '../../compensatory-rest-settings/compensatory-rest-settings.component';
import { SurchargeModeSettingsComponent } from '../../surcharge-mode-settings/surcharge-mode-settings.component';
import { OvertimeSettingsComponent } from '../../overtime-settings/overtime-settings.component';
import { ComplianceEnforcementSettingsComponent } from '../../compliance-enforcement-settings/compliance-enforcement-settings.component';
import { CounterRulesComponent } from '../../counter-rules/counter-rules.component';
import { PeriodCapRulesComponent } from '../../period-cap-rules/period-cap-rules.component';
import { RestrictedTimeWindowRulesComponent } from '../../restricted-time-window-rules/restricted-time-window-rules.component';
import { HolidayWorkExemptionsComponent } from '../../holiday-work-exemptions/holiday-work-exemptions.component';

@Component({
  selector: 'app-settings-compliance-section',
  templateUrl: './settings-compliance-section.component.html',
  styleUrl: './settings-compliance-section.component.scss',
  standalone: true,
  imports: [
    ActiveIndustriesSettingsComponent,
    CompensatoryRestSettingsComponent,
    SurchargeModeSettingsComponent,
    OvertimeSettingsComponent,
    ComplianceEnforcementSettingsComponent,
    CounterRulesComponent,
    PeriodCapRulesComponent,
    RestrictedTimeWindowRulesComponent,
    HolidayWorkExemptionsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComplianceSectionComponent {}

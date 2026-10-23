// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Work section of the expert settings page: the rows with the work, scheduling-default, scheduling-rule,
 * wizard, individual-period and monthly-target-hour cards (each card loads and saves its own settings).
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorkSettingComponent } from '../../work-setting/work-setting.component';
import { SchedulingDefaultsSettingComponent } from '../../scheduling-defaults-setting/scheduling-defaults-setting.component';
import { SchedulingRulesComponent } from '../../scheduling-rules/scheduling-rules.component';
import { WizardSettingsComponent } from '../../wizard-settings/wizard-settings.component';
import { IndividualPeriodsComponent } from '../../individual-periods/individual-periods.component';
import { MonthlyTargetHoursComponent } from '../../monthly-target-hours/monthly-target-hours.component';

@Component({
  selector: 'app-settings-work-section',
  templateUrl: './settings-work-section.component.html',
  styleUrl: './settings-work-section.component.scss',
  standalone: true,
  imports: [
    WorkSettingComponent,
    SchedulingDefaultsSettingComponent,
    SchedulingRulesComponent,
    WizardSettingsComponent,
    IndividualPeriodsComponent,
    MonthlyTargetHoursComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsWorkSectionComponent {}

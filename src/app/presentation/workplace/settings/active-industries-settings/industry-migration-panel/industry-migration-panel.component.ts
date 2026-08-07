// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Feedback panel of the active-industries card: names the contracts that still reference a
 * scheduling rule of a no longer active industry and lets the admin move each of them onto a
 * selectable rule. Switching the industry deliberately leaves those contracts alone, so this panel
 * is the only place where that consequence becomes visible and can be resolved.
 * @param isExpanded - Whether the candidate list below the warning line is unfolded.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { DataManagementIndustryMigrationService } from 'src/app/domain/services/scheduling/data-management-industry-migration.service';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';

@Component({
  selector: 'app-industry-migration-panel',
  templateUrl: './industry-migration-panel.component.html',
  styleUrls: ['./industry-migration-panel.component.scss'],
  standalone: true,
  imports: [TranslateModule, IconAngleDownComponent, IconAngleRightComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndustryMigrationPanelComponent {
  public migrationService = inject(DataManagementIndustryMigrationService);

  public readonly isExpanded = signal(false);

  toggleList(): void {
    this.isExpanded.update((expanded) => !expanded);
  }

  onTargetChange(contractId: string, schedulingRuleId: string): void {
    this.migrationService.setTarget(contractId, schedulingRuleId);
  }

  async onApply(): Promise<void> {
    await this.migrationService.applyMigrations();
  }
}

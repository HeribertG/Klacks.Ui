// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Bar that shows while a variant (key) is being edited: names the key, says that its shifts are not binding and
 * offers to end variant mode. It stays visible on the schedule and on the shift edit and cut screens, because variant
 * mode lasts across them; it ends on a scenario selection, a group change or the end button.
 * @param activeVariant - The key being edited, or null when variant mode is off (the bar then renders nothing)
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ScenarioVariantService } from 'src/app/domain/services/schedule/scenario-variant.service';

@Component({
  selector: 'app-variant-mode-bar',
  templateUrl: './variant-mode-bar.component.html',
  styleUrls: ['./variant-mode-bar.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantModeBarComponent {
  private scenarioVariantService = inject(ScenarioVariantService);

  readonly activeVariant = this.scenarioVariantService.activeVariant;

  onEnd(): void {
    this.scenarioVariantService.leave();
  }
}

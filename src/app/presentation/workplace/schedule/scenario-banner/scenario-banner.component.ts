// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Banner above the schedule grid while a what-if scenario is open: names the scenario, states that the
 * original plan stays unchanged and offers accept, reject and back-to-original. All decisions go through
 * ScenarioActionsService, the same path the scenario selector uses (confirmation, compliance gate,
 * supervisor override), so the banner holds no decision logic of its own.
 * @param activeScenario - The open scenario, or null when the original plan is shown
 * @param canDecide - Whether accept and reject are offered to the signed-in user
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { ScenarioActionsService } from '../services/scenario-actions.service';

@Component({
  selector: 'app-scenario-banner',
  templateUrl: './scenario-banner.component.html',
  styleUrls: ['./scenario-banner.component.scss'],
  standalone: true,
  imports: [TranslateModule, TrashIconRedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScenarioBannerComponent {
  private analyseScenarioService = inject(AnalyseScenarioService);
  private scenarioActions = inject(ScenarioActionsService);

  readonly activeScenario = this.analyseScenarioService.activeScenario;
  readonly canDecide = this.scenarioActions.canDecide;

  onAccept(): void {
    this.scenarioActions.confirmAccept();
  }

  onReject(): void {
    this.scenarioActions.confirmReject();
  }

  onExit(): void {
    this.scenarioActions.exit();
  }
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Dropdown component for selecting and managing what-if scenarios.
 * @param analyseScenarioService - Service for scenario state and operations
 */

import { ChangeDetectionStrategy, Component, inject, ViewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NgbDropdownModule, NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { IAnalyseScenario } from 'src/app/domain/models/schedule/analyse-scenario-class';
import { CreateScenarioDialogComponent } from '../../dialogs/create-scenario-dialog/create-scenario-dialog.component';

@Component({
  selector: 'app-scenario-selector',
  templateUrl: './scenario-selector.component.html',
  styleUrls: ['./scenario-selector.component.scss'],
  standalone: true,
  imports: [NgbDropdownModule, NgbTooltip, TranslateModule, CreateScenarioDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScenarioSelectorComponent {
  @ViewChild('createScenarioDialog') createScenarioDialog!: CreateScenarioDialogComponent;

  public analyseScenarioService = inject(AnalyseScenarioService);

  onSelectScenario(scenario: IAnalyseScenario): void {
    this.analyseScenarioService.selectScenario(scenario);
  }

  onExitScenario(): void {
    this.analyseScenarioService.exitScenario();
  }

  onCreateNew(): void {
    this.createScenarioDialog.open();
  }

  onAccept(): void {
    const scenario = this.analyseScenarioService.activeScenario();
    if (!scenario) return;
    this.analyseScenarioService.acceptScenario(scenario.id).subscribe();
  }

  onReject(): void {
    const scenario = this.analyseScenarioService.activeScenario();
    if (!scenario) return;
    this.analyseScenarioService.rejectScenario(scenario.id).subscribe();
  }
}

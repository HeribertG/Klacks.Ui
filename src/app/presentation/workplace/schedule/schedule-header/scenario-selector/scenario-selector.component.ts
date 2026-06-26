// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Dropdown component for selecting and managing what-if scenarios.
 * @param analyseScenarioService - Service for scenario state and operations
 */

import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  viewChild
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { IAnalyseScenario } from 'src/app/domain/models/schedule/analyse-scenario-class';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { CreateScenarioDialogComponent } from '../../dialogs/create-scenario-dialog/create-scenario-dialog.component';
import { RenameScenarioDialogComponent } from '../../dialogs/rename-scenario-dialog/rename-scenario-dialog.component';
import { DeleteAllScenariosDialogComponent } from '../../dialogs/delete-all-scenarios-dialog/delete-all-scenarios-dialog.component';

@Component({
  selector: 'app-scenario-selector',
  templateUrl: './scenario-selector.component.html',
  styleUrls: ['./scenario-selector.component.scss'],
  standalone: true,
  imports: [NgbDropdownModule, TranslateModule, CreateScenarioDialogComponent, RenameScenarioDialogComponent, DeleteAllScenariosDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScenarioSelectorComponent implements OnInit {
  readonly createScenarioDialog = viewChild.required<CreateScenarioDialogComponent>('createScenarioDialog');

  readonly renameScenarioDialog = viewChild.required<RenameScenarioDialogComponent>('renameScenarioDialog');

  readonly deleteAllScenariosDialog = viewChild.required<DeleteAllScenariosDialogComponent>('deleteAllScenariosDialog');

  public analyseScenarioService = inject(AnalyseScenarioService);
  protected dataManagementSchedule = inject(DataManagementScheduleService);

  ngOnInit(): void {
    this.analyseScenarioService.loadScenarios(
      this.dataManagementSchedule.workFilter.selectedGroup,
    );
  }

  onSelectScenario(scenario: IAnalyseScenario): void {
    this.analyseScenarioService.selectScenario(scenario);
  }

  onExitScenario(): void {
    this.analyseScenarioService.exitScenario();
  }

  onCreateNew(): void {
    this.createScenarioDialog().open();
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

  onRename(): void {
    const scenario = this.analyseScenarioService.activeScenario();
    if (!scenario) return;
    this.renameScenarioDialog().open(scenario);
  }

  onDeleteAll(): void {
    this.deleteAllScenariosDialog().open(
      this.dataManagementSchedule.workFilter.selectedGroup,
    );
  }
}

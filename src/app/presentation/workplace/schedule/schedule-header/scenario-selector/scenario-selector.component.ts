// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Dropdown component for selecting and managing what-if scenarios.
 * @param analyseScenarioService - Service for scenario state and operations
 *
 * Handles the 409 conflict returned when accepting a scenario is blocked by
 * enforced compliance violations, offering an authorised-only supervisor
 * override as a single, explicitly confirmed second attempt.
 */

import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  viewChild
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { IAnalyseScenario } from 'src/app/domain/models/schedule/analyse-scenario-class';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { CreateScenarioDialogComponent } from '../../dialogs/create-scenario-dialog/create-scenario-dialog.component';
import { RenameScenarioDialogComponent } from '../../dialogs/rename-scenario-dialog/rename-scenario-dialog.component';
import { DeleteAllScenariosDialogComponent } from '../../dialogs/delete-all-scenarios-dialog/delete-all-scenarios-dialog.component';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

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
  private modalService = inject(ModalService);
  private authorizationService = inject(AuthorizationService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);

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
    this.analyseScenarioService.acceptScenario(scenario.id).subscribe({
      next: () => undefined,
      error: (err: HttpErrorResponse) => this.handleAcceptError(scenario.id, err),
    });
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

  private handleAcceptError(id: string, err: HttpErrorResponse): void {
    if (err.status !== 409) return;

    const detail =
      (err.error as { detail?: string } | null)?.detail ??
      this.translateService.instant('schedule.scenario.accept.blockedTitle');

    if (this.authorizationService.isAuthorised) {
      this.modalService.openModal({
        type: ModalType.Confirmation,
        title: this.translateService.instant('schedule.scenario.accept.overrideConfirmTitle'),
        message: detail,
        confirmText: this.translateService.instant('schedule.scenario.accept.overrideConfirmButton'),
        cancelText: this.translateService.instant('cancel'),
        onConfirm: () => this.onOverrideAccept(id),
      });
    } else {
      this.toastShowService.showError(detail);
    }
  }

  private onOverrideAccept(id: string): void {
    this.analyseScenarioService.acceptScenario(id, true).subscribe({
      next: () => undefined,
      error: (err: HttpErrorResponse) => {
        const message =
          err.status === 409
            ? this.translateService.instant('schedule.scenario.accept.overrideRejected')
            : ((err.error as { detail?: string } | null)?.detail ??
                this.translateService.instant('schedule.scenario.accept.overrideRejected'));
        this.toastShowService.showError(message);
      },
    });
  }
}

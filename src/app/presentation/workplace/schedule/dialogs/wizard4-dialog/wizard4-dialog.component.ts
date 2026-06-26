// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Info dialog for the Wizard 4 Background Optimizer. Shows all active scenarios
 * created by the background optimizer and allows switching to one.
 * @param wizard4Scenarios - Computed list of Active scenarios created by wizard4
 */

import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  inject,
  viewChild
} from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { IAnalyseScenario } from 'src/app/domain/models/schedule/analyse-scenario-class';

const WIZARD4_CREATOR = 'wizard4';

@Component({
  selector: 'app-wizard4-dialog',
  templateUrl: './wizard4-dialog.component.html',
  styleUrls: ['./wizard4-dialog.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Wizard4DialogComponent {
  readonly modalTemplate = viewChild.required<TemplateRef<unknown>>('wizard4Modal');

  private readonly ngbModal = inject(NgbModal);
  private readonly analyseScenarioService = inject(AnalyseScenarioService);
  private readonly dataManagementSchedule = inject(DataManagementScheduleService);

  private modalRef: NgbModalRef | null = null;

  readonly wizard4Scenarios = computed(() =>
    this.analyseScenarioService.scenarios().filter(s => s.createdByUser === WIZARD4_CREATOR),
  );

  open(): void {
    this.modalRef = this.ngbModal.open(this.modalTemplate(), {
      centered: true,
      size: 'md',
    });
  }

  onSelectScenario(scenario: IAnalyseScenario): void {
    this.analyseScenarioService.selectScenario(scenario);
    this.dataManagementSchedule.readDatas();
    this.modalRef?.close();
  }

  onClose(): void {
    this.modalRef?.close();
  }
}

// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Route page of the employee import (Settings). Provides the page-scoped import state, registers Settings
 * as the active manager for savebar and search, and shows the step indicator plus the component of the current step.
 * @param state - Page-scoped state machine of the import (File, Mapping, Preview, Result)
 */

import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { ClientImportStateService } from 'src/app/domain/services/client/client-import-state.service';
import { ClientImportStep } from 'src/app/domain/enums/client-import.enums';
import { RouteName } from 'src/app/domain/enums/entity-names.enum';
import { ClientImportFileStepComponent } from '../client-import-file-step/client-import-file-step.component';
import { ClientImportMappingStepComponent } from '../client-import-mapping-step/client-import-mapping-step.component';
import { ClientImportPreviewStepComponent } from '../client-import-preview-step/client-import-preview-step.component';
import { ClientImportResultStepComponent } from '../client-import-result-step/client-import-result-step.component';

const STEP_KEY_PREFIX = 'clientImport.step.';

@Component({
  selector: 'app-client-import-home',
  templateUrl: './client-import-home.component.html',
  styleUrls: ['./client-import-home.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    ClientImportFileStepComponent,
    ClientImportMappingStepComponent,
    ClientImportPreviewStepComponent,
    ClientImportResultStepComponent,
  ],
  providers: [ClientImportStateService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientImportHomeComponent implements OnInit {
  readonly state = inject(ClientImportStateService);
  readonly Step = ClientImportStep;
  readonly steps: readonly ClientImportStep[] = Object.values(ClientImportStep);
  readonly stepKeyPrefix = STEP_KEY_PREFIX;

  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private workplaceStateService = inject(WorkplaceStateService);

  ngOnInit(): void {
    this.workplaceStateService.setActiveManagerByRoute(RouteName.SETTINGS);
    this.layoutService.setContainerToNormalSize();
    this.savebarService.setSavebarVisibility(false);
    this.searchService.setSearchVisibility(false);

    void this.state.initialize();
  }

  isStepDone(step: ClientImportStep): boolean {
    return this.steps.indexOf(step) < this.steps.indexOf(this.state.step());
  }
}

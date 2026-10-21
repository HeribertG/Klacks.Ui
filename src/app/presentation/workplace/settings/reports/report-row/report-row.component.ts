// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * One row of the report template list, including the edit modal with general settings,
 * data source, designer, parameters, preview, history and manual. The modal state and its actions
 * live in component-scoped services, one instance per row, which the template binds directly.
 * @param data - Report template shown in this row
 * @param id - DOM id prefix of the row
 */

import { Component, ChangeDetectionStrategy, ChangeDetectorRef, TemplateRef, inject, input, output, signal, viewChild, DestroyRef } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReportTemplate } from 'src/app/domain/models/report/report-template.model';
import { ReportOrientation } from 'src/app/domain/models/report/report-orientation.enum';
import { ReportPageSize } from 'src/app/domain/models/report/report-page-size.enum';
import { ReportParameterType } from 'src/app/domain/models/report/report-parameter-type.enum';
import { IClientForReplacement } from 'src/app/domain/models/client/client-for-replacement.interface';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { DateInputComponent } from 'src/app/presentation/shared/date-input/date-input.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { IconCopyGreyComponent } from 'src/app/presentation/icons/icon-copy-grey.component';
import { IconExportComponent } from 'src/app/presentation/icons/icon-export.component';
import { ReportParametersComponent } from '../report-parameters/report-parameters.component';
import { ReportDesignerComponent } from '../report-designer/report-designer.component';
import { REPORT_MANUAL_NAME } from './report-row.constants';
import { ReportRowEditorStateService } from './services/report-row-editor-state.service';
import { ReportRowSourceService } from './services/report-row-source.service';
import { ReportRowParametersService } from './services/report-row-parameters.service';
import { ReportRowPreviewService } from './services/report-row-preview.service';
import { ReportRowExportService } from './services/report-row-export.service';
import { ReportRowVersionsService } from './services/report-row-versions.service';
import { ReportRowSessionService } from './services/report-row-session.service';

@Component({
  selector: 'app-report-row',
  templateUrl: './report-row.component.html',
  styleUrls: ['./report-row.component.scss'],
  standalone: true,
  imports: [TranslateModule, FormsModule, NgbModule, ReportDesignerComponent, DateInputComponent, TrashIconRedComponent, IconCopyGreyComponent, IconExportComponent, ReportParametersComponent],
  providers: [
    ReportRowEditorStateService,
    ReportRowSourceService,
    ReportRowParametersService,
    ReportRowPreviewService,
    ReportRowExportService,
    ReportRowVersionsService,
    ReportRowSessionService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportRowComponent {
  readonly contentTemplate = viewChild.required<TemplateRef<unknown>>('content');
  readonly data = input.required<ReportTemplate>();
  readonly id = input.required<string>();
  readonly isDeleteEvent = output<void>();
  readonly cancelNewEvent = output<void>();
  readonly duplicateEvent = output<void>();

  readonly state = inject(ReportRowEditorStateService);
  readonly sources = inject(ReportRowSourceService);
  readonly parameters = inject(ReportRowParametersService);
  readonly preview = inject(ReportRowPreviewService);
  readonly exporter = inject(ReportRowExportService);
  readonly history = inject(ReportRowVersionsService);
  readonly session = inject(ReportRowSessionService);

  private translate = inject(TranslateService);
  private manualLoader = inject(ManualLoaderService);
  private clientService = inject(DataClientService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  private loadedManualLang: string | null = null;
  readonly manualContent = signal('');
  previewClients: IClientForReplacement[] = [];

  readonly ReportOrientation = ReportOrientation;
  readonly ReportPageSize = ReportPageSize;
  readonly ReportParameterType = ReportParameterType;

  constructor() {
    this.state.bindSource(this.data);
  }

  /**
   * Opens the edit modal for this row; also called by the template list for a freshly added template.
   */
  openModal(): void {
    this.state.load(this.data());
    this.preview.prepare();
    this.sources.loadDefaultsState();
    this.loadPreviewClients();
    this.loadManual();
    this.history.reset();
    this.session.open(this.contentTemplate(), () => this.cancelNewEvent.emit());
  }

  onExportClick(event: Event): void {
    event.stopPropagation();
    this.exporter.exportTemplate(this.data());
  }

  onDuplicateClick(event: Event): void {
    event.stopPropagation();
    this.duplicateEvent.emit();
  }

  onDeleteClick(event: Event): void {
    event.stopPropagation();
    this.isDeleteEvent.emit();
  }

  loadManual(): void {
    const lang = this.translate.currentLang || DomainMessages.DEFAULT_LANG;
    if (this.loadedManualLang === lang) {
      return;
    }
    this.loadedManualLang = lang;
    this.manualLoader.loadManual(REPORT_MANUAL_NAME, lang)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(content => this.manualContent.set(content));
  }

  private loadPreviewClients(): void {
    if (this.previewClients.length > 0) return;
    this.clientService.getClientsForReplacement()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(clients => {
        this.previewClients = clients;
        this.cdr.markForCheck();
      });
  }
}

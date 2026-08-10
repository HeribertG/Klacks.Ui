// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { DatePipe } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EffectRef,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  effect,
  inject,
  runInInjectionContext,
  input,
  output
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { IAbsence } from 'src/app/domain/models/absence/absence-class';
import { IBreakPlaceholder } from 'src/app/domain/models/break/break-class';
import { IClientBreak } from 'src/app/domain/models/client/i-client-break';
import { EntrySource } from 'src/app/domain/enums/entry-source.enum';
import { DataManagementAbsenceGanttService } from 'src/app/domain/services/absence/data-management-absence-gantt.service';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/break/data-management-break-placeholder.service';
import { daysBetweenDates } from 'src/app/shared/helpers/date.helper';
import { Language } from 'src/app/domain/models/settings/language-config';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { DataManagementReportService } from 'src/app/domain/services/report/data-management-report.service';
import { ReportPdfService, ReportGenerationContext } from 'src/app/domain/services/report/report-pdf.service';
import { ReportDataProviderService, ReportData } from 'src/app/domain/services/report/report-data-provider.service';
import { ReportService } from 'src/app/domain/services/report/report.service';
import { ReportType } from 'src/app/domain/models/report/report-template.model';
import { DataReportApiService } from 'src/app/infrastructure/api/report/data-report-api.service';
import { ReportTemplateResolverService } from 'src/app/domain/services/report/report-template-resolver.service';
import { ReportDefaultsService } from 'src/app/domain/services/report/report-defaults.service';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';
import { TextFormatterService } from 'src/app/presentation/shared/rich-text-editor/text-formatter.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';

const ABSENCE_SOURCE_ID = 'absence-gantt';
const ABSENCE_DATA_SET_ID = 'absences';
const YEAR_START_SUFFIX = '-01-01T00:00:00';
const YEAR_END_SUFFIX = '-12-31T00:00:00';

@Component({
  selector: 'app-absence-gantt-grid',
  templateUrl: './absence-gantt-grid.component.html',
  styleUrls: ['./absence-gantt-grid.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, TranslateModule],
  providers: [
    TableSortingService,
    ReportPdfService,
    ReportDataProviderService,
    ReportService,
    DataManagementReportService,
    DataReportApiService,
    AbsenceLookupService,
  ],
})
export class AbsenceGanttGridComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Input() selectedRowData: IBreakPlaceholder[] | undefined;
  readonly selectedRow = input(-1);
  readonly exportPDF = output<void>();
  readonly breakSelected = output<string>();

  public dataManagementAbsence = inject(DataManagementAbsenceGanttService);
  public dataManagementBreak = inject(DataManagementBreakPlaceholderService);
  public sortingService = inject(TableSortingService);
  private translateService = inject(TranslateService);
  private injector = inject(Injector);
  private reportManagement = inject(DataManagementReportService);
  private reportPdfService = inject(ReportPdfService);
  private reportDataProvider = inject(ReportDataProviderService);
  private reportService = inject(ReportService);
  private templateResolver = inject(ReportTemplateResolverService);
  private reportDefaults = inject(ReportDefaultsService);
  private absenceLookup = inject(AbsenceLookupService);
  private textFormatterService = inject(TextFormatterService);
  private cdr = inject(ChangeDetectorRef);

  currentLang: Language = DomainMessages.DEFAULT_LANG;

  highlightRowId: string | undefined = undefined;

  private ngUnsubscribe = new Subject<void>();
  private effectRef: EffectRef | null = null;

  private absence: IAbsence[] = [];

  ngOnInit(): void {
    this.sortingService.initialize({
      columns: ['from', 'until', 'absence'],
      defaultOrderBy: 'absence',
      defaultSortOrder: 'asc',
      useThreeWaySort: true
    });

    this.readSignals();
    this.absence = this.dataManagementAbsence.absenceList();
    this.currentLang = this.translateService.currentLang as Language;
  }

  ngAfterViewInit(): void {
    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();

    if (this.effectRef) {
      this.effectRef.destroy();
      this.effectRef = null;
    }
  }

  onAbsenceName(value: IBreakPlaceholder): string {
    if (value) {
      const abs = this.absence.find((x) => x.id === value.absenceId);
      if (abs) {
        return getLocalizedValue(abs.name, this.currentLang);
      }
    }
    return 'undefined';
  }

  onAbsenceValue(value: IBreakPlaceholder): number | string {
    if (value) {
      const abs = this.absence.find((x) => x.id === value.absenceId);
      if (abs) {
        const defaultValue = abs.defaultValue!;
        if (defaultValue > 0) {
          const diff =
            Math.floor(daysBetweenDates(value.from!, value.until!)) + 1;
          return diff * defaultValue;
        }
      }
    }
    return '';
  }

  isScheduleBreak(value: IBreakPlaceholder): boolean {
    return value?.entrySource === EntrySource.Schedule;
  }

  getPlainTextNote(value: IBreakPlaceholder): string {
    if (!value?.information) {
      return '';
    }
    return this.textFormatterService.stripFormatting(value.information);
  }

  onClickedRow(value: IBreakPlaceholder) {
    this.highlightRowId = value.id;
    if (value.id) {
      this.breakSelected.emit(value.id);
    }
  }

  onClickHeader(orderBy: string) {
    this.sortingService.onHeaderClick(orderBy, () => {
      if (this.selectedRowData && this.selectedRowData.length > 0) {
        this.sortSelectedRowData();
      }
    });
  }

  private sortSelectedRowData() {
    const orderBy = this.sortingService.getCurrentOrderBy();
    const sortOrder = this.sortingService.getCurrentSortOrder();

    if (!sortOrder || !this.selectedRowData) {
      return;
    }

    const multiplier = sortOrder === 'asc' ? 1 : -1;

    this.selectedRowData = [...this.selectedRowData].sort((a, b) => {
      if (orderBy === 'from') {
        return this.compareDates(a.from, b.from) * multiplier;
      } else if (orderBy === 'until') {
        return this.compareDates(a.until, b.until) * multiplier;
      } else if (orderBy === 'absence') {
        return this.compareAbsences(a, b) * multiplier;
      }
      return 0;
    });
  }

  private compareDates(date1: Date | undefined, date2: Date | undefined): number {
    if (!date1 && !date2) return 0;
    if (!date1) return -1;
    if (!date2) return 1;
    
    const d1 = date1 instanceof Date ? date1 : new Date(date1);
    const d2 = date2 instanceof Date ? date2 : new Date(date2);
    
    return d1.getTime() - d2.getTime();
  }

  private compareAbsences(a: IBreakPlaceholder, b: IBreakPlaceholder): number {
    const absenceA = this.absence.find(x => x.id === a.absenceId);
    const absenceB = this.absence.find(x => x.id === b.absenceId);

    const nameA = getLocalizedValue(absenceA?.name, this.currentLang);
    const nameB = getLocalizedValue(absenceB?.name, this.currentLang);

    return nameA.localeCompare(nameB);
  }

  /* #endregion   header */

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      this.effectRef = effect(() => {
        const isReset = this.dataManagementAbsence.isReset();
        if (isReset) {
          this.absence = this.dataManagementAbsence.absenceList();
        }
      });
    });
  }

  async exportToPDF(): Promise<void> {
    if (!this.selectedRowData || this.selectedRowData.length === 0) {
      return;
    }

    await this.absenceLookup.loadIfNeeded();

    const clientName = this.getClientName();
    const client = this.getSelectedClient();

    const template = this.templateResolver.resolveForSource(
      this.reportManagement.reportTemplateList(),
      ABSENCE_SOURCE_ID,
      this.reportDefaults.getDefaultTemplateId(ABSENCE_SOURCE_ID)
    ) ?? this.reportManagement.createDefaultTemplate(ReportType.Absence);

    if (!template.sourceId) {
      template.sourceId = ABSENCE_SOURCE_ID;
      template.dataSetIds = [ABSENCE_DATA_SET_ID];
    }

    const provider = this.reportDataProvider.getProvider(
      template.sourceId ?? ABSENCE_SOURCE_ID,
      template.dataSetIds ?? [ABSENCE_DATA_SET_ID]
    );

    const rows = this.selectedRowData.map(bp => ({
      ...bp,
      clientId: client?.id,
      clientName: client?.name ?? '',
      clientFirstName: client?.firstName ?? '',
      absence: this.absenceLookup.findAbsenceForEntryId(bp.absenceId),
    }));

    const data: ReportData = client
      ? { rows, clients: [this.toReportClient(client)] }
      : { rows };
    const year = this.dataManagementBreak.breakFilter.currentYear;

    const context: ReportGenerationContext = {
      template,
      provider,
      data,
      groupName: '',
      startDate: `${year}${YEAR_START_SUFFIX}`,
      endDate: `${year}${YEAR_END_SUFFIX}`,
    };

    const blob = await this.reportPdfService.generatePdf(context);
    const fileName = `absence-report-${clientName}-${new Date().getTime()}.pdf`;
    this.reportService.downloadPdf(blob, fileName);

    this.exportPDF.emit();
  }

  private toReportClient(client: IClientBreak): Record<string, unknown> {
    return {
      id: client.id,
      idNumber: client.idNumber,
      company: client.company,
      name: client.name,
      firstName: client.firstName,
    };
  }

  private getSelectedClient(): IClientBreak | undefined {
    if (this.selectedRow() >= 0 && this.selectedRow() < this.dataManagementBreak.clients.length) {
      return this.dataManagementBreak.clients[this.selectedRow()];
    }
    return undefined;
  }

  private getClientName(): string {
    if (this.selectedRow() >= 0 && this.selectedRow() < this.dataManagementBreak.clients.length) {
      const client = this.dataManagementBreak.clients[this.selectedRow()];
      const firstName = client.firstName || '';
      const lastName = client.name || '';
      const company = client.company || '';
      
      if (firstName || lastName) {
        return `${firstName} ${lastName}`.trim();
      }
      return company;
    }
    return 'Unknown Client';
  }
}

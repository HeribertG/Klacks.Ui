// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Third step of the employee import: shows every row as it will be written, its status and issues,
 * lets the user skip a row, pick a missing gender or create a duplicate anyway, and starts the commit.
 * The commit button stays disabled while any row has an error or a preview/commit request is pending.
 * Issue texts receive the issue arguments as parameters (row numbers shown 1-based, dates in the language
 * of the user). The skip checkbox only reflects and sets the decision of the user: rows skipped by a rule
 * (former employee, duplicate) cannot be un-skipped with it and show the reason as issue. Info notes that
 * describe a rule applied to many rows are shown once in a notes block above the table; each row only lists
 * its own issues (errors and warnings first, info muted). Count texts use singular or plural keys.
 * @param state - Page-scoped import state provided by the import page
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ClientImportStateService } from 'src/app/domain/services/client/client-import-state.service';
import {
  ClientImportDuplicateHandling,
  ClientImportGender,
  ClientImportIssueSeverity,
  ClientImportRowStatus,
} from 'src/app/domain/enums/client-import.enums';
import {
  CLIENT_IMPORT_FIELDS,
  CLIENT_IMPORT_COUNT_KEYS,
  CLIENT_IMPORT_ISSUE_ARG_DATE,
  CLIENT_IMPORT_ISSUE_ARG_REASON,
  CLIENT_IMPORT_ISSUE_ARG_ROW,
  CLIENT_IMPORT_ISSUE_ARG_VALUE,
  CLIENT_IMPORT_ISSUE_CODE_MISSING_GENDER,
  CLIENT_IMPORT_ISSUE_CODES,
  CLIENT_IMPORT_ISSUE_KEY_PREFIX,
  CLIENT_IMPORT_ISSUE_REASON_EXIT_BEFORE_ENTRY,
  CLIENT_IMPORT_ISSUE_REASON_KEY_PREFIX,
  CLIENT_IMPORT_ISSUE_REASONS,
  CLIENT_IMPORT_SYSTEM_SKIP_ISSUE_CODES,
  CLIENT_IMPORT_TARGET_KEY_PREFIX,
} from 'src/app/domain/constants/client-import.constants';
import { LocaleService } from 'src/app/application/services/locale.service';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { formatCalendarDate } from 'src/app/shared/helpers/locale-date-format.helper';
import { IClientImportIssue } from 'src/app/domain/models/client-import/i-client-import-issue';
import { IClientImportIssueSummaryEntry } from 'src/app/domain/models/client-import/i-client-import-issue-summary-entry';
import { clientImportCountKey } from 'src/app/domain/services/client/client-import-count-key.helper';
import { rowSpecificClientImportIssues } from 'src/app/domain/services/client/client-import-issue-summary.helper';
import { IClientImportPreviewRow } from 'src/app/domain/models/client-import/i-client-import-preview-row';
import { CalendarDatePipe } from 'src/app/shared/pipes/calendar-date/calendar-date.pipe';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

const UNKNOWN_ISSUE_KEY = 'clientImport.issue.unknown';
const NOTE_ALL_ROWS_KEY = 'clientImport.preview.notesAllRows';
const NOTE_SOME_ROWS_KEY = 'clientImport.preview.notesSomeRows';
const ROW_NUMBER_OFFSET = 1;
const SEVERITY_RANK: Readonly<Record<ClientImportIssueSeverity, number>> = {
  [ClientImportIssueSeverity.Error]: 3,
  [ClientImportIssueSeverity.Warning]: 2,
  [ClientImportIssueSeverity.Info]: 1,
};
const CELL_CLASS_PREFIX = 'cell-';
const NO_CELL_CLASS = '';

const CLIENT_IMPORT_PREVIEW_CELL_FIELDS = {
  name: [CLIENT_IMPORT_FIELDS.firstName, CLIENT_IMPORT_FIELDS.lastName, CLIENT_IMPORT_FIELDS.title],
  gender: [CLIENT_IMPORT_FIELDS.gender],
  birthdate: [CLIENT_IMPORT_FIELDS.birthdate],
  address: [
    CLIENT_IMPORT_FIELDS.street,
    CLIENT_IMPORT_FIELDS.zip,
    CLIENT_IMPORT_FIELDS.city,
    CLIENT_IMPORT_FIELDS.country,
  ],
  contact: [CLIENT_IMPORT_FIELDS.email, CLIENT_IMPORT_FIELDS.phone, CLIENT_IMPORT_FIELDS.mobile],
  dates: [CLIENT_IMPORT_FIELDS.entryDate, CLIENT_IMPORT_FIELDS.exitDate],
  assignment: [CLIENT_IMPORT_FIELDS.contractName, CLIENT_IMPORT_FIELDS.groupName],
} as const;

type ClientImportPreviewCell = keyof typeof CLIENT_IMPORT_PREVIEW_CELL_FIELDS;

const SEVERITY_CLASSES: Readonly<Record<ClientImportIssueSeverity, string>> = {
  [ClientImportIssueSeverity.Error]: 'issue-error',
  [ClientImportIssueSeverity.Warning]: 'issue-warning',
  [ClientImportIssueSeverity.Info]: 'issue-info',
};

@Component({
  selector: 'app-client-import-preview-step',
  templateUrl: './client-import-preview-step.component.html',
  styleUrls: ['./client-import-preview-step.component.scss'],
  standalone: true,
  imports: [TranslateModule, CalendarDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientImportPreviewStepComponent {
  readonly state = inject(ClientImportStateService);
  readonly Status = ClientImportRowStatus;
  readonly genders = Object.values(ClientImportGender);
  readonly targetKeyPrefix = CLIENT_IMPORT_TARGET_KEY_PREFIX;
  readonly rowNumberOffset = ROW_NUMBER_OFFSET;
  readonly countKeys = CLIENT_IMPORT_COUNT_KEYS;
  readonly countKey = clientImportCountKey;

  private translate = inject(TranslateService);
  private toastShowService = inject(ToastShowService);
  private localeService = inject(LocaleService);

  readonly unmappedColumnNames = computed(() => {
    const columns = this.state.parseResult()?.columns ?? [];
    const unmapped = new Set(this.state.preview()?.unmappedColumns ?? []);
    return columns.filter((column) => unmapped.has(column.index)).map((column) => column.header);
  });

  issueKey(issue: IClientImportIssue): string {
    if (!(CLIENT_IMPORT_ISSUE_CODES as readonly string[]).includes(issue.code)) {
      return UNKNOWN_ISSUE_KEY;
    }
    const reason = issue.args[CLIENT_IMPORT_ISSUE_ARG_REASON];
    const hasReasonText = !!reason && !!CLIENT_IMPORT_ISSUE_REASONS[issue.code]?.includes(reason);
    return hasReasonText
      ? `${CLIENT_IMPORT_ISSUE_REASON_KEY_PREFIX}${issue.code}.${reason}`
      : CLIENT_IMPORT_ISSUE_KEY_PREFIX + issue.code;
  }

  issueParams(issue: IClientImportIssue): Record<string, string> {
    const params: Record<string, string> = { ...issue.args, code: issue.code };
    const row = issue.args[CLIENT_IMPORT_ISSUE_ARG_ROW];
    if (row !== undefined && Number.isInteger(Number(row))) {
      params[CLIENT_IMPORT_ISSUE_ARG_ROW] = String(Number(row) + ROW_NUMBER_OFFSET);
    }
    if (params[CLIENT_IMPORT_ISSUE_ARG_DATE] !== undefined) {
      params[CLIENT_IMPORT_ISSUE_ARG_DATE] = this.formatDate(params[CLIENT_IMPORT_ISSUE_ARG_DATE]);
    }
    if (issue.args[CLIENT_IMPORT_ISSUE_ARG_REASON] === CLIENT_IMPORT_ISSUE_REASON_EXIT_BEFORE_ENTRY) {
      params[CLIENT_IMPORT_ISSUE_ARG_VALUE] = this.formatDate(params[CLIENT_IMPORT_ISSUE_ARG_VALUE] ?? '');
    }
    return params;
  }

  rowIssues(row: IClientImportPreviewRow): IClientImportIssue[] {
    return rowSpecificClientImportIssues(row.issues);
  }

  noteScopeKey(entry: IClientImportIssueSummaryEntry): string {
    return entry.rowCount >= this.totalRows() ? NOTE_ALL_ROWS_KEY : NOTE_SOME_ROWS_KEY;
  }

  noteScopeParams(entry: IClientImportIssueSummaryEntry): Record<string, number> {
    return { count: entry.rowCount, total: this.totalRows() };
  }

  countryName(abbreviation: string | null): string {
    if (!abbreviation) {
      return '';
    }
    const country = this.state.countries().find((entry) => entry.abbreviation === abbreviation);
    return (country && getLocalizedValue(country.name, this.translate.currentLang)) || abbreviation;
  }

  severityClass(issue: IClientImportIssue): string {
    return SEVERITY_CLASSES[issue.severity] ?? SEVERITY_CLASSES[ClientImportIssueSeverity.Info];
  }

  cellClass(row: IClientImportPreviewRow, cell: ClientImportPreviewCell): string {
    const fields: readonly string[] = CLIENT_IMPORT_PREVIEW_CELL_FIELDS[cell];
    const worst = row.issues
      .filter((issue) => issue.field !== null && fields.includes(issue.field))
      .reduce<ClientImportIssueSeverity | null>(
        (current, issue) =>
          current === null || SEVERITY_RANK[issue.severity] > SEVERITY_RANK[current] ? issue.severity : current,
        null,
      );
    return worst === null || worst === ClientImportIssueSeverity.Info
      ? NO_CELL_CLASS
      : CELL_CLASS_PREFIX + SEVERITY_CLASSES[worst];
  }

  needsGender(row: IClientImportPreviewRow): boolean {
    return (
      row.issues.some((issue) => issue.code === CLIENT_IMPORT_ISSUE_CODE_MISSING_GENDER) ||
      !!this.state.overrideFor(row.rowIndex)?.gender
    );
  }

  isDuplicate(row: IClientImportPreviewRow): boolean {
    return row.duplicateOfClientId !== null || row.duplicateOfRowIndex !== null;
  }

  isSkipped(row: IClientImportPreviewRow): boolean {
    return this.state.overrideFor(row.rowIndex)?.skip === true || row.status === ClientImportRowStatus.Skipped;
  }

  isSkipLocked(row: IClientImportPreviewRow): boolean {
    return (
      row.status === ClientImportRowStatus.Skipped &&
      row.issues.some((issue) => CLIENT_IMPORT_SYSTEM_SKIP_ISSUE_CODES.includes(issue.code))
    );
  }

  selectedGender(row: IClientImportPreviewRow): string {
    return this.state.overrideFor(row.rowIndex)?.gender ?? '';
  }

  createsDuplicate(row: IClientImportPreviewRow): boolean {
    return (
      this.state.overrideFor(row.rowIndex)?.createDuplicate ??
      this.state.policy().duplicates === ClientImportDuplicateHandling.CreateAnyway
    );
  }

  onToggleSkip(row: IClientImportPreviewRow, event: Event): void {
    this.state.setRowSkip(row.rowIndex, (event.target as HTMLInputElement).checked);
  }

  onGenderChange(row: IClientImportPreviewRow, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.state.setRowGender(row.rowIndex, value ? (value as ClientImportGender) : null);
  }

  onToggleCreateDuplicate(row: IClientImportPreviewRow, event: Event): void {
    this.state.setRowCreateDuplicate(row.rowIndex, (event.target as HTMLInputElement).checked);
  }

  onToggleOnlyProblems(event: Event): void {
    this.state.showOnlyProblems.set((event.target as HTMLInputElement).checked);
  }

  onBack(): void {
    this.state.backToMapping();
  }

  async onCommit(): Promise<void> {
    if (!this.state.canCommit()) {
      return;
    }
    const committed = await this.state.commit();
    if (committed) {
      return;
    }
    this.toastShowService.showError(this.translate.instant(this.state.commitErrorKey()));
  }

  private totalRows(): number {
    return this.state.preview()?.rows.length ?? 0;
  }

  private formatDate(value: string): string {
    return formatCalendarDate(value, this.localeService.getLocale()) ?? value;
  }
}

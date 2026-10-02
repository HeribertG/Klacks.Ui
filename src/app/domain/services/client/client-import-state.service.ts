// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Page-scoped state machine of the employee import (File -> Mapping -> Preview -> Result). It keeps the
 * parsed grid, the column mapping, the rules for missing information and the per-row overrides, and
 * re-requests the server preview debounced after every change so the preview always shows what a
 * commit would write. A commit is only possible while a fresh preview without error rows is on screen
 * and no request is pending; the flag is set synchronously to block double clicks.
 * @param step - Current wizard step
 * @param parseResult - Raw grid, columns and detected mapping returned by the parse endpoint
 * @param mapping - One mapping entry per column; every target except Ignore is used at most once
 * @param policy - Rules for rows with missing information (contract, group, entry date, types, duplicates)
 * @param rowOverrides - Per-row decisions (skip, gender, create duplicate anyway)
 * @param preview - Last preview result from the server
 * @param issueSummary - Info notes that apply to many rows, shown once above the preview table with their row count
 * @param ignoredTargetHints - Mapped targets that are not imported and not already explained by a note in issueSummary
 * @param isPreviewPending - True from a change until its preview response arrived (debounce window included)
 * @param dateFormatChosen - True once the user picked a date format themselves; later column changes never override it
 * @param dateFormatNeedsChoice - True while the mapped date columns do not prove the day/month order and the user has not chosen
 */

import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, firstValueFrom, map, of, switchMap, timer } from 'rxjs';
import { DataClientImportService } from 'src/app/infrastructure/api/client/data-client-import.service';
import { DataContractService } from 'src/app/infrastructure/api/contract/data-contract.service';
import { DataGroupService } from 'src/app/infrastructure/api/group/data-group.service';
import { DataCountryStateService } from 'src/app/infrastructure/api/settings/data-country-state.service';
import {
  CLIENT_IMPORT_ACCEPTED_EXTENSIONS,
  CLIENT_IMPORT_AMBIGUOUS_DATE_FORMAT_DEFAULT,
  CLIENT_IMPORT_COMMIT_ERROR_KEY,
  CLIENT_IMPORT_DATE_TARGETS,
  CLIENT_IMPORT_DEFAULT_POLICY,
  CLIENT_IMPORT_ERROR_CODE_ALREADY_COMMITTED,
  CLIENT_IMPORT_ERROR_CODE_UNSUPPORTED_LANGUAGE,
  CLIENT_IMPORT_FILE_ERROR_TOO_LARGE,
  CLIENT_IMPORT_FILE_ERROR_UNSUPPORTED,
  CLIENT_IMPORT_MAX_FILE_SIZE_BYTES,
  CLIENT_IMPORT_PREVIEW_DEBOUNCE_MS,
  CLIENT_IMPORT_PREVIEW_ERROR_KEY,
  CLIENT_IMPORT_PREVIEW_IMMEDIATE_MS,
  CLIENT_IMPORT_SUMMARY_ISSUE_TARGETS,
  CLIENT_IMPORT_TEMPLATE_FALLBACK_LANGUAGE,
  CLIENT_IMPORT_UNKNOWN_ERROR_CODE,
} from 'src/app/domain/constants/client-import.constants';
import {
  ClientImportDateFormat,
  ClientImportGender,
  ClientImportIssueSeverity,
  ClientImportNameOrder,
  ClientImportRowStatus,
  ClientImportStep,
  ClientImportTarget,
} from 'src/app/domain/enums/client-import.enums';
import { IClientImportParseResult } from 'src/app/domain/models/client-import/i-client-import-parse-result';
import { IClientImportColumnMapping } from 'src/app/domain/models/client-import/i-client-import-column-mapping';
import { IClientImportPolicy } from 'src/app/domain/models/client-import/i-client-import-policy';
import { IClientImportRowOverride } from 'src/app/domain/models/client-import/i-client-import-row-override';
import { IClientImportPreviewResult } from 'src/app/domain/models/client-import/i-client-import-preview-result';
import { IClientImportPreviewRow } from 'src/app/domain/models/client-import/i-client-import-preview-row';
import { IClientImportCommitResult } from 'src/app/domain/models/client-import/i-client-import-commit-result';
import { IClientImportRequest } from 'src/app/domain/models/client-import/i-client-import-request';
import { IClientImportOption } from 'src/app/domain/models/client-import/i-client-import-option';
import { IClientImportTemplateFile } from 'src/app/domain/models/client-import/i-client-import-template-file';
import { IContract } from 'src/app/domain/models/contract/contract-class';
import { IGroup } from 'src/app/domain/models/group/group-class';
import { ICountry } from 'src/app/domain/models/client/i-country';
import {
  clientImportErrorKey,
  extractClientImportErrorCode,
  extractClientImportUploadErrorCode,
  isClientImportConflict,
  readClientImportErrorCode,
} from './client-import-error.helper';
import { detectClientImportDateFormat } from './client-import-date-format.helper';
import { summarizeClientImportIssues } from './client-import-issue-summary.helper';
import { IClientImportIssueSummaryEntry } from 'src/app/domain/models/client-import/i-client-import-issue-summary-entry';
import { formatDateOnly, parseCalendarDate } from 'src/app/shared/helpers/calendar-date.helper';

const CONTRACT_PAGE = 0;
const CONTRACT_PAGE_SIZE = 1000;
const ROOT_DEPTH = 0;
const USER_CONFIDENCE = 1;
const NO_CONFIDENCE = 0;

type PreviewTrigger = number | null;

interface PreviewOutcome {
  result: IClientImportPreviewResult | null;
  errorCode?: string | null;
}

@Injectable()
export class ClientImportStateService {
  private dataClientImportService = inject(DataClientImportService);
  private dataContractService = inject(DataContractService);
  private dataGroupService = inject(DataGroupService);
  private dataCountryStateService = inject(DataCountryStateService);
  private destroyRef = inject(DestroyRef);

  private readonly previewTrigger = new Subject<PreviewTrigger>();

  readonly step = signal<ClientImportStep>(ClientImportStep.File);
  readonly file = signal<File | null>(null);
  readonly parseResult = signal<IClientImportParseResult | null>(null);
  readonly mapping = signal<IClientImportColumnMapping[]>([]);
  readonly dateFormat = signal<ClientImportDateFormat>(ClientImportDateFormat.DayMonthYear);
  readonly nameOrder = signal<ClientImportNameOrder>(ClientImportNameOrder.FirstLast);
  readonly policy = signal<IClientImportPolicy>({ ...CLIENT_IMPORT_DEFAULT_POLICY });
  readonly rowOverrides = signal<IClientImportRowOverride[]>([]);
  readonly preview = signal<IClientImportPreviewResult | null>(null);
  readonly previewFailed = signal(false);
  readonly previewErrorCode = signal<string | null>(null);
  readonly dateFormatChosen = signal(false);
  readonly commitResult = signal<IClientImportCommitResult | null>(null);
  readonly fileErrorCode = signal<string | null>(null);
  readonly commitErrorCode = signal<string | null>(null);
  readonly commitAlreadyDone = signal(false);
  readonly showOnlyProblems = signal(false);

  readonly isParsing = signal(false);
  readonly isPreviewPending = signal(false);
  readonly isCommitting = signal(false);

  readonly contracts = signal<IClientImportOption[]>([]);
  readonly groups = signal<IClientImportOption[]>([]);
  readonly countries = signal<ICountry[]>([]);

  readonly mappedTargets = computed<ReadonlySet<ClientImportTarget>>(
    () => new Set(this.mapping().map((m) => m.target).filter((t) => t !== ClientImportTarget.Ignore)),
  );

  readonly isFullNameMapped = computed(() => this.mappedTargets().has(ClientImportTarget.FullName));

  readonly isFirstOrLastNameMapped = computed(
    () =>
      this.mappedTargets().has(ClientImportTarget.FirstName) ||
      this.mappedTargets().has(ClientImportTarget.LastName),
  );

  readonly isDateTargetMapped = computed(() =>
    CLIENT_IMPORT_DATE_TARGETS.some((target) => this.mappedTargets().has(target)),
  );

  private readonly dateDetection = computed(() => {
    const dateColumns = this.mapping()
      .filter((entry) => CLIENT_IMPORT_DATE_TARGETS.includes(entry.target))
      .map((entry) => entry.columnIndex);
    const values = (this.parseResult()?.rows ?? []).flatMap((row) =>
      dateColumns.map((column) => row[column]?.trim() ?? '').filter((value) => value.length > 0),
    );
    return detectClientImportDateFormat(values);
  });

  readonly dateFormatNeedsChoice = computed(
    () => this.isDateTargetMapped() && this.dateDetection().ambiguous && !this.dateFormatChosen(),
  );

  readonly previewErrorKey = computed(() =>
    clientImportErrorKey(this.previewErrorCode(), CLIENT_IMPORT_PREVIEW_ERROR_KEY),
  );

  readonly commitErrorKey = computed(() =>
    clientImportErrorKey(this.commitErrorCode(), CLIENT_IMPORT_COMMIT_ERROR_KEY),
  );

  readonly errorRowCount = computed(
    () => this.preview()?.rows.filter((row) => row.status === ClientImportRowStatus.Error).length ?? 0,
  );

  readonly readyRowCount = computed(
    () => this.preview()?.rows.filter((row) => row.status === ClientImportRowStatus.Ready).length ?? 0,
  );

  readonly issueSummary = computed<IClientImportIssueSummaryEntry[]>(() =>
    summarizeClientImportIssues(this.preview()?.rows ?? []),
  );

  readonly ignoredTargetHints = computed<ClientImportTarget[]>(() => {
    const summarizedCodes = new Set(this.issueSummary().map((entry) => entry.issue.code));
    return (this.preview()?.ignoredTargets ?? []).filter((target) => {
      const code = CLIENT_IMPORT_SUMMARY_ISSUE_TARGETS[target];
      return !code || !summarizedCodes.has(code);
    });
  });

  readonly visibleRows = computed<IClientImportPreviewRow[]>(() => {
    const rows = this.preview()?.rows ?? [];
    return this.showOnlyProblems() ? rows.filter((row) => this.hasProblem(row)) : rows;
  });

  readonly canCommit = computed(
    () =>
      this.step() === ClientImportStep.Preview &&
      this.preview() !== null &&
      !this.previewFailed() &&
      !this.isPreviewPending() &&
      !this.isCommitting() &&
      this.errorRowCount() === 0 &&
      this.readyRowCount() > 0,
  );

  constructor() {
    this.previewTrigger
      .pipe(
        switchMap((delay) => (delay === null ? EMPTY : this.previewAfter(delay))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ result, errorCode }) => {
        this.previewFailed.set(result === null);
        this.previewErrorCode.set(result === null ? (errorCode ?? null) : null);
        if (result) {
          this.preview.set(result);
        }
        this.isPreviewPending.set(false);
      });
  }

  async initialize(): Promise<void> {
    const [contracts, groups, countries] = await Promise.all([
      this.loadOrEmpty(this.dataContractService.getList(CONTRACT_PAGE, CONTRACT_PAGE_SIZE)),
      this.loadOrEmpty(this.dataGroupService.getGroupTree().pipe(map((tree) => tree.nodes))),
      this.loadOrEmpty(this.dataCountryStateService.getCountryList()),
    ]);

    this.contracts.set(this.toContractOptions(contracts));
    this.groups.set(this.flattenGroups(groups, ROOT_DEPTH));
    this.countries.set(countries);
  }

  async selectFile(file: File): Promise<boolean> {
    const validationError = this.validateFile(file);
    if (validationError) {
      this.fileErrorCode.set(validationError);
      return false;
    }

    this.file.set(file);
    return this.parse(file, null);
  }

  async selectSheet(sheetName: string): Promise<boolean> {
    const file = this.file();
    if (!file || this.isParsing()) {
      return false;
    }
    return this.parse(file, sheetName);
  }

  setColumnTarget(columnIndex: number, target: ClientImportTarget): void {
    this.mapping.update((mapping) =>
      mapping.map((entry) => {
        if (entry.columnIndex === columnIndex) {
          return { ...entry, target, confidence: USER_CONFIDENCE };
        }
        if (target !== ClientImportTarget.Ignore && entry.target === target) {
          return { ...entry, target: ClientImportTarget.Ignore, confidence: NO_CONFIDENCE };
        }
        return entry;
      }),
    );
    if (!this.dateFormatChosen()) {
      this.dateFormat.set(this.dateDetection().format);
    }
    this.schedulePreview();
  }

  setDateFormat(dateFormat: ClientImportDateFormat): void {
    this.dateFormatChosen.set(true);
    this.dateFormat.set(dateFormat);
    this.schedulePreview();
  }

  setNameOrder(nameOrder: ClientImportNameOrder): void {
    this.nameOrder.set(nameOrder);
    this.schedulePreview();
  }

  updatePolicy(change: Partial<IClientImportPolicy>): void {
    this.policy.update((policy) => ({ ...policy, ...change }));
    this.schedulePreview();
  }

  setEntryDate(value: string | null): void {
    const date = parseCalendarDate(value);
    this.updatePolicy({ entryDate: date ? formatDateOnly(date) : null });
  }

  setRowSkip(rowIndex: number, skip: boolean): void {
    this.updateOverride(rowIndex, { skip: skip ? true : null });
  }

  setRowGender(rowIndex: number, gender: ClientImportGender | null): void {
    this.updateOverride(rowIndex, { gender });
  }

  setRowCreateDuplicate(rowIndex: number, createDuplicate: boolean): void {
    this.updateOverride(rowIndex, { createDuplicate });
  }

  overrideFor(rowIndex: number): IClientImportRowOverride | undefined {
    return this.rowOverrides().find((o) => o.rowIndex === rowIndex);
  }

  goToPreview(): void {
    if (!this.parseResult()) {
      return;
    }
    this.step.set(ClientImportStep.Preview);
    this.schedulePreview(CLIENT_IMPORT_PREVIEW_IMMEDIATE_MS);
  }

  backToMapping(): void {
    if (this.isCommitting()) {
      return;
    }
    this.cancelPreview();
    this.step.set(ClientImportStep.Mapping);
  }

  restart(): void {
    if (this.isCommitting()) {
      return;
    }
    this.cancelPreview();
    this.file.set(null);
    this.parseResult.set(null);
    this.mapping.set([]);
    this.rowOverrides.set([]);
    this.preview.set(null);
    this.previewFailed.set(false);
    this.previewErrorCode.set(null);
    this.dateFormatChosen.set(false);
    this.commitResult.set(null);
    this.fileErrorCode.set(null);
    this.commitErrorCode.set(null);
    this.commitAlreadyDone.set(false);
    this.step.set(ClientImportStep.File);
  }

  async commit(): Promise<boolean> {
    if (!this.canCommit()) {
      return false;
    }

    const request = this.buildRequest();
    if (!request) {
      return false;
    }

    this.isCommitting.set(true);
    this.commitErrorCode.set(null);
    this.commitAlreadyDone.set(false);
    try {
      const result = await firstValueFrom(this.dataClientImportService.commit(request));
      this.commitResult.set(result);
      this.step.set(ClientImportStep.Result);
      return true;
    } catch (error) {
      const alreadyDone = isClientImportConflict(error);
      this.commitErrorCode.set(
        extractClientImportErrorCode(error) ?? (alreadyDone ? CLIENT_IMPORT_ERROR_CODE_ALREADY_COMMITTED : null),
      );
      this.commitAlreadyDone.set(alreadyDone);
      this.schedulePreview(CLIENT_IMPORT_PREVIEW_IMMEDIATE_MS);
      return false;
    } finally {
      this.isCommitting.set(false);
    }
  }

  async downloadTemplate(language: string): Promise<IClientImportTemplateFile> {
    try {
      return await firstValueFrom(this.dataClientImportService.downloadTemplate(language));
    } catch (error) {
      const code = await readClientImportErrorCode(error);
      if (code !== CLIENT_IMPORT_ERROR_CODE_UNSUPPORTED_LANGUAGE || language === CLIENT_IMPORT_TEMPLATE_FALLBACK_LANGUAGE) {
        throw error;
      }
      return firstValueFrom(this.dataClientImportService.downloadTemplate(CLIENT_IMPORT_TEMPLATE_FALLBACK_LANGUAGE));
    }
  }

  buildRequest(): IClientImportRequest | null {
    const parsed = this.parseResult();
    if (!parsed) {
      return null;
    }

    return {
      token: parsed.token,
      fileName: parsed.fileName,
      columns: parsed.columns,
      rows: parsed.rows,
      mapping: this.mapping(),
      dateFormat: this.dateFormat(),
      nameOrder: this.nameOrder(),
      policy: this.policy(),
      rowOverrides: this.rowOverrides(),
    };
  }

  hasProblem(row: IClientImportPreviewRow): boolean {
    return (
      row.status === ClientImportRowStatus.Error ||
      row.issues.some(
        (issue) =>
          issue.severity === ClientImportIssueSeverity.Error ||
          issue.severity === ClientImportIssueSeverity.Warning,
      )
    );
  }

  private async parse(file: File, sheetName: string | null): Promise<boolean> {
    this.isParsing.set(true);
    this.fileErrorCode.set(null);
    try {
      const result = await firstValueFrom(this.dataClientImportService.parse(file, sheetName));
      this.applyParseResult(result);
      return true;
    } catch (error) {
      this.fileErrorCode.set(extractClientImportUploadErrorCode(error, file.size) ?? CLIENT_IMPORT_UNKNOWN_ERROR_CODE);
      return false;
    } finally {
      this.isParsing.set(false);
    }
  }

  private applyParseResult(result: IClientImportParseResult): void {
    this.cancelPreview();
    this.parseResult.set(result);
    this.mapping.set(this.completeMapping(result));
    this.dateFormatChosen.set(false);
    this.dateFormat.set(result.dateFormatAmbiguous ? CLIENT_IMPORT_AMBIGUOUS_DATE_FORMAT_DEFAULT : result.dateFormat);
    this.nameOrder.set(result.nameOrder);
    this.rowOverrides.set([]);
    this.preview.set(null);
    this.previewFailed.set(false);
    this.previewErrorCode.set(null);
    this.commitErrorCode.set(null);
    this.step.set(ClientImportStep.Mapping);
  }

  private completeMapping(result: IClientImportParseResult): IClientImportColumnMapping[] {
    return result.columns.map(
      (column) =>
        result.mapping.find((entry) => entry.columnIndex === column.index) ?? {
          columnIndex: column.index,
          target: ClientImportTarget.Ignore,
          confidence: NO_CONFIDENCE,
        },
    );
  }

  private validateFile(file: File): string | null {
    const name = file.name.toLowerCase();
    if (!CLIENT_IMPORT_ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension))) {
      return CLIENT_IMPORT_FILE_ERROR_UNSUPPORTED;
    }
    if (file.size > CLIENT_IMPORT_MAX_FILE_SIZE_BYTES) {
      return CLIENT_IMPORT_FILE_ERROR_TOO_LARGE;
    }
    return null;
  }

  private updateOverride(rowIndex: number, change: Partial<IClientImportRowOverride>): void {
    this.rowOverrides.update((overrides) => {
      const existing = overrides.find((o) => o.rowIndex === rowIndex) ?? {
        rowIndex,
        skip: null,
        gender: null,
        createDuplicate: null,
      };
      const updated = { ...existing, ...change };
      const others = overrides.filter((o) => o.rowIndex !== rowIndex);
      const isEmpty = updated.skip === null && updated.gender === null && updated.createDuplicate === null;
      return isEmpty ? others : [...others, updated];
    });
    this.schedulePreview();
  }

  private schedulePreview(delay: number = CLIENT_IMPORT_PREVIEW_DEBOUNCE_MS): void {
    if (this.step() !== ClientImportStep.Preview || !this.parseResult()) {
      return;
    }
    this.isPreviewPending.set(true);
    this.previewTrigger.next(delay);
  }

  private cancelPreview(): void {
    this.previewTrigger.next(null);
    this.isPreviewPending.set(false);
  }

  private previewAfter(delay: number): Observable<PreviewOutcome> {
    return timer(delay).pipe(
      switchMap(() => {
        const request = this.buildRequest();
        if (!request) {
          return of<PreviewOutcome>({ result: null });
        }
        return this.dataClientImportService.preview(request).pipe(
          map((result): PreviewOutcome => ({ result })),
          catchError((error) => of<PreviewOutcome>({ result: null, errorCode: extractClientImportErrorCode(error) })),
        );
      }),
    );
  }

  private async loadOrEmpty<T>(source: Observable<T[]>): Promise<T[]> {
    try {
      return (await firstValueFrom(source)) ?? [];
    } catch {
      return [];
    }
  }

  private toContractOptions(contracts: IContract[]): IClientImportOption[] {
    return contracts
      .filter((contract): contract is IContract & { id: string } => !!contract.id)
      .map((contract) => ({ id: contract.id, name: contract.name, depth: ROOT_DEPTH }));
  }

  private flattenGroups(nodes: IGroup[], depth: number): IClientImportOption[] {
    return nodes.flatMap((node) => [
      ...(node.id ? [{ id: node.id, name: node.name, depth }] : []),
      ...this.flattenGroups(node.children ?? [], depth + 1),
    ]);
  }
}

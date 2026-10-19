// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * One row of the ERP import file list: file name, size, receipt time, channel and uploader, plus the
 * tab-specific detail (inbox: waiting / import progress; processed: status icon and order summary, with the
 * rejected orders of a CompletedWithWarnings file expandable, at most 50 listed plus "+N more"; failed: translated
 * failure reason with retry and delete). A file whose content equals an earlier delivery shows an info hint (never
 * blocking). The row and its hint/rejected-orders rows carry table semantics (role row/cell) inside the page's table.
 * @param file - The import ledger row to display
 * @param index - Position in the visible list, used for stable element ids
 * @param tab - The file list tab the row is shown in (decides the detail column and the actions)
 * @param isRetryDisabled - Disables the retry button while a retry is running
 * @param retryRequested - Emits the file when the user asks to import it again
 * @param deleteRequested - Emits the file when the user asks to delete it
 */

import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { IErpImportFile } from 'src/app/domain/models/settings/erp-import-file';
import { ErpImportFileStatus } from 'src/app/domain/enums/erp-import-file-status.enum';
import {
  ERP_IMPORT_FILES_I18N,
  ERP_IMPORT_LIST_LIMITS,
  ERP_IMPORT_SUMMARY_SEPARATOR,
} from 'src/app/domain/constants/erp-import-file.constants';
import {
  erpImportChannelKey,
  erpImportFailureReasonText,
  erpImportRejectedWithoutReference,
  erpImportStatusText,
  erpImportSummary,
} from 'src/app/domain/helpers/erp-import-file.helper';
import { formatFileSize } from 'src/app/domain/helpers/file-size.helper';
import { CompanyDateTimePipe } from 'src/app/shared/pipes/company-date-time/company-date-time.pipe';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { InfoIconComponent } from 'src/app/presentation/icons/icon-info.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { ErpImportFilesTab, erpImportFilesColumnCount } from '../erp-import-files-tab';

const SUCCESS_GLYPH = '✓';
const WARNING_GLYPH = '⚠';
const SOURCE_SEPARATOR = ' · ';
const REJECTED_LIST_ID_PREFIX = 'erp-drop-points-files-rejected-';

@Component({
  selector: 'app-erp-import-file-row',
  standalone: true,
  imports: [
    TranslateModule,
    CompanyDateTimePipe,
    IconAngleDownComponent,
    IconAngleRightComponent,
    InfoIconComponent,
    TrashIconRedComponent,
  ],
  templateUrl: './erp-import-file-row.component.html',
  styleUrls: ['./erp-import-file-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErpImportFileRowComponent {
  readonly file = input.required<IErpImportFile>();
  readonly index = input.required<number>();
  readonly tab = input.required<ErpImportFilesTab>();
  readonly isRetryDisabled = input(false);

  readonly retryRequested = output<IErpImportFile>();
  readonly deleteRequested = output<IErpImportFile>();

  protected readonly i18n = ERP_IMPORT_FILES_I18N;
  protected readonly summarySeparator = ERP_IMPORT_SUMMARY_SEPARATOR;
  protected readonly sourceSeparator = SOURCE_SEPARATOR;
  protected readonly isExpanded = signal(false);

  protected readonly isWarning = computed(() => this.file().status === ErpImportFileStatus.CompletedWithWarnings);
  protected readonly statusGlyph = computed(() => (this.isWarning() ? WARNING_GLYPH : SUCCESS_GLYPH));
  protected readonly statusText = computed(() => erpImportStatusText(this.file()));
  protected readonly summary = computed(() => erpImportSummary(this.file()));
  protected readonly failureReason = computed(() => erpImportFailureReasonText(this.file().failureReason));
  protected readonly channelKey = computed(() => erpImportChannelKey(this.file().channel));
  protected readonly rejectedWithoutReference = computed(() => erpImportRejectedWithoutReference(this.file()));
  protected readonly canExpand = computed(() => this.isWarning() && this.file().rejectedCount > 0);
  protected readonly size = computed(() => formatFileSize(this.file().sizeBytes));
  protected readonly columnCount = computed(() => erpImportFilesColumnCount(this.tab()));
  protected readonly rejectedListId = computed(() => `${REJECTED_LIST_ID_PREFIX}${this.index()}`);
  protected readonly shownRejectedOrders = computed(() =>
    this.file().rejectedOrders.slice(0, ERP_IMPORT_LIST_LIMITS.REJECTED_ORDERS_SHOWN),
  );
  protected readonly hiddenRejectedOrders = computed(() =>
    Math.max(0, this.file().rejectedOrders.length - ERP_IMPORT_LIST_LIMITS.REJECTED_ORDERS_SHOWN),
  );

  toggleExpand(): void {
    this.isExpanded.update((expanded) => !expanded);
  }

  onRetry(): void {
    this.retryRequested.emit(this.file());
  }

  onDelete(): void {
    this.deleteRequested.emit(this.file());
  }
}

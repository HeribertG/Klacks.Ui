// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * First step of the employee import: choose or drop an xlsx/csv file, download the template, and
 * choose the sheet of a workbook with several sheets. File problems are shown inline in the language
 * of the user via their contract error code. The template is requested in the current UI language; the
 * state falls back to English when the server does not know that language.
 * @param state - Page-scoped import state provided by the import page
 */

import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ClientImportStateService } from 'src/app/domain/services/client/client-import-state.service';
import { DragDropFileUploadDirective } from 'src/app/presentation/directives/drag-drop-file-upload.directive';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { triggerBlobDownload } from 'src/app/shared/helpers/file-download.helper';
import { CLIENT_IMPORT_FILE_INPUT_ACCEPT } from 'src/app/domain/constants/client-import.constants';
import { clientImportFileErrorKey } from 'src/app/domain/services/client/client-import-error.helper';

const TEMPLATE_ERROR_KEY = 'clientImport.file.templateError';

@Component({
  selector: 'app-client-import-file-step',
  templateUrl: './client-import-file-step.component.html',
  styleUrls: ['./client-import-file-step.component.scss'],
  standalone: true,
  imports: [TranslateModule, DragDropFileUploadDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientImportFileStepComponent {
  readonly state = inject(ClientImportStateService);
  readonly accept = CLIENT_IMPORT_FILE_INPUT_ACCEPT;
  readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  private translate = inject(TranslateService);
  private toastShowService = inject(ToastShowService);

  fileErrorKey(): string | null {
    return clientImportFileErrorKey(this.state.fileErrorCode());
  }

  onChooseFile(): void {
    if (this.state.isParsing()) {
      return;
    }
    const input = this.fileInput().nativeElement;
    input.value = '';
    input.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) {
      await this.state.selectFile(file);
    }
  }

  async onFilesDropped(files: FileList): Promise<void> {
    const file = files.item(0);
    if (file && !this.state.isParsing()) {
      await this.state.selectFile(file);
    }
  }

  async onDownloadTemplate(): Promise<void> {
    const language = this.translate.currentLang || this.translate.defaultLang;
    try {
      const template = await this.state.downloadTemplate(language);
      triggerBlobDownload(template.blob, template.fileName);
    } catch {
      this.toastShowService.showError(this.translate.instant(TEMPLATE_ERROR_KEY));
    }
  }
}

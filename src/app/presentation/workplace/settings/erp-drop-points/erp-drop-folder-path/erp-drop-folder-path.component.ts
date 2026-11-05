// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Read-only row on the import schedule card that shows the folder an ERP writes its XML files into, with a
 * copy-to-clipboard button and a one-line hint on what the ERP account needs. The hint follows the installation:
 * native (write right on exactly this folder), Docker with a reported host folder (server folder, container path
 * shown below) or Docker without one (container path, a mounted server folder or push/upload is needed).
 * @param folder - Drop folder as reported by the backend (path, installation kind, host-path flag)
 */

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IErpDropFolder } from 'src/app/domain/models/settings/erp-drop-folder.interface';
import {
  ERP_DROP_FOLDER_I18N,
  ERP_DROP_FOLDER_INSTALLATIONS,
} from 'src/app/domain/constants/erp-import-file.constants';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { IconCopyGreyComponent } from 'src/app/presentation/icons/icon-copy-grey.component';

@Component({
  selector: 'app-erp-drop-folder-path',
  standalone: true,
  imports: [TranslateModule, IconCopyGreyComponent],
  templateUrl: './erp-drop-folder-path.component.html',
  styleUrls: ['./erp-drop-folder-path.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErpDropFolderPathComponent {
  readonly folder = input.required<IErpDropFolder>();

  private readonly clipboard = inject(Clipboard);
  private readonly toastService = inject(ToastShowService);
  private readonly translate = inject(TranslateService);

  protected readonly i18n = ERP_DROP_FOLDER_I18N;

  readonly hintKey = computed(() => {
    const folder = this.folder();
    if (folder.installation === ERP_DROP_FOLDER_INSTALLATIONS.NATIVE) {
      return ERP_DROP_FOLDER_I18N.HINT_NATIVE;
    }
    return folder.isHostPath ? ERP_DROP_FOLDER_I18N.HINT_DOCKER_HOST : ERP_DROP_FOLDER_I18N.HINT_DOCKER_CONTAINER;
  });

  readonly secondaryContainerPath = computed(() => {
    const folder = this.folder();
    return folder.isHostPath ? folder.containerPath : null;
  });

  onCopyPath(): void {
    if (this.clipboard.copy(this.folder().folderPath)) {
      this.toastService.showSuccess(this.translate.instant(ERP_DROP_FOLDER_I18N.COPIED), '');
      return;
    }
    this.toastService.showError(this.translate.instant(ERP_DROP_FOLDER_I18N.COPY_FAILED));
  }
}

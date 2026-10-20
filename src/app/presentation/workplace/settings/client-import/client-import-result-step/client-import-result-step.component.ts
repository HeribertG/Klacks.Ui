// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Last step of the employee import: shows how many employees were created and skipped and how many
 * addresses were queued for background geocoding. The buttons to the employee list and to another file sit in the
 * footer of the import modal.
 * @param state - Import state provided by the settings card (ClientImportCardComponent)
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ClientImportStateService } from 'src/app/domain/services/client/client-import-state.service';
import { CLIENT_IMPORT_COUNT_KEYS } from 'src/app/domain/constants/client-import.constants';
import { clientImportCountKey } from 'src/app/domain/services/client/client-import-count-key.helper';

@Component({
  selector: 'app-client-import-result-step',
  templateUrl: './client-import-result-step.component.html',
  styleUrls: ['./client-import-result-step.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientImportResultStepComponent {
  readonly state = inject(ClientImportStateService);
  readonly countKeys = CLIENT_IMPORT_COUNT_KEYS;
  readonly countKey = clientImportCountKey;
}

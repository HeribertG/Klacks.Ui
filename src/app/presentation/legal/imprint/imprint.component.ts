// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Standalone page component for the legal imprint (Impressum) including the AGPL-3.0 license and source code notice.
 * Accessible without authentication from the login page and main menu.
 * @param apiRepositoryUrl - Public repository of the server (Klacks.Api)
 * @param uiRepositoryUrl - Public repository of the web client (Klacks.Ui)
 */
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LegalBackButtonComponent } from '../legal-back-button/legal-back-button.component';
import {
  SOURCE_CODE_API_REPOSITORY_URL,
  SOURCE_CODE_LICENSE_URL,
  SOURCE_CODE_UI_REPOSITORY_URL,
} from 'src/app/domain/constants/source-code.constants';
import { BUILD_INFO } from 'src/app/domain/interfaces/build-info.interface';
import { toSourceCodeUrl } from 'src/app/domain/helpers/source-code-url.helper';

@Component({
  selector: 'app-imprint',
  templateUrl: './imprint.component.html',
  styleUrl: './imprint.component.scss',
  standalone: true,
  imports: [TranslateModule, LegalBackButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImprintComponent {
  private readonly buildInfo = inject(BUILD_INFO);

  readonly apiRepositoryUrl = toSourceCodeUrl(SOURCE_CODE_API_REPOSITORY_URL, this.buildInfo);
  readonly uiRepositoryUrl = toSourceCodeUrl(SOURCE_CODE_UI_REPOSITORY_URL, this.buildInfo);
  readonly licenseUrl = SOURCE_CODE_LICENSE_URL;
}

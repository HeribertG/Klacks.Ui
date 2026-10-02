// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Settings card that introduces the employee import (Excel/CSV) and opens the import page.
 * @param navigationService - Navigates to the employee import page
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NavigationService } from 'src/app/presentation/services/navigation.service';

@Component({
  selector: 'app-client-import-card',
  templateUrl: './client-import-card.component.html',
  styleUrls: ['./client-import-card.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientImportCardComponent {
  private navigationService = inject(NavigationService);

  openImport(): void {
    this.navigationService.navigateToClientImport();
  }
}

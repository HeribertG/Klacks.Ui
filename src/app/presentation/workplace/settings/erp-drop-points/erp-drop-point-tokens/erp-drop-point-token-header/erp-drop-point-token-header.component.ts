// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Stateless column header row for the ERP import token list of one drop point.
 */

import { Component, ChangeDetectionStrategy } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-erp-drop-point-token-header',
  templateUrl: './erp-drop-point-token-header.component.html',
  styleUrls: ['./erp-drop-point-token-header.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErpDropPointTokenHeaderComponent {
}

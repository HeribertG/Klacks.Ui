// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ExcelComponent } from 'src/app/presentation/icons/excel.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-button-excel',
  templateUrl: './button-excel.component.html',
  styleUrls: ['./button-excel.component.scss'],
  standalone: true,
  imports: [CommonModule, ExcelComponent],
})
export class ButtonExcelComponent {
  // @Input() properties
  @Input() buttonDisabled = false;
}

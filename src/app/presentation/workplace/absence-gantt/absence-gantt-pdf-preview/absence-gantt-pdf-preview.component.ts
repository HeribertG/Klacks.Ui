// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-absence-gantt-pdf-preview',
  templateUrl: './absence-gantt-pdf-preview.component.html',
  styleUrls: ['./absence-gantt-pdf-preview.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class AbsenceGanttPdfPreviewComponent {}

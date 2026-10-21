// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Overlay editor of a formula field: name, formula text with test run, variable list and the formula manual.
 * @param field - The formula field being edited
 */

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { ReportField } from 'src/app/domain/models/report/report-field.model';
import { PropertyGridComponent } from 'src/app/presentation/workplace/settings/macros/property-grid/property-grid.component';
import { ReportDesignerStateService } from '../services/report-designer-state.service';
import { ReportDesignerFormulaService } from '../services/report-designer-formula.service';

@Component({
  selector: 'app-report-designer-formula-editor',
  templateUrl: './report-designer-formula-editor.component.html',
  styleUrls: ['./report-designer-formula-editor.component.scss'],
  standalone: true,
  imports: [TranslateModule, PropertyGridComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportDesignerFormulaEditorComponent {
  readonly field = input.required<ReportField>();

  protected readonly state = inject(ReportDesignerStateService);
  protected readonly formulaSvc = inject(ReportDesignerFormulaService);
}

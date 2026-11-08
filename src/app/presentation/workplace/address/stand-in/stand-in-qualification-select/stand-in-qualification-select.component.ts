// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pull-down of the "Create placeholders" dialog that picks the qualifications all new placeholders hold. Open, it lists
 * every qualification with a checkbox, its symbol and its name; closed, it shows only the symbols of the chosen ones (a
 * qualification without a symbol shows its name, cut short), at most a fixed number followed by "+n", and the names of
 * all chosen ones as tooltip and accessible name. Without a choice it shows a placeholder text.
 * @param qualifications - Qualifications the user can choose from
 * @param selectedIds - Ids of the chosen qualifications
 * @param lang - Language of the qualification names
 * @param toggled - Emits the id of a qualification whose checkbox was switched
 */
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { IQualification } from 'src/app/domain/models/settings/qualification';
import { Language } from 'src/app/domain/models/settings/language.type';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { STAND_IN_QUALIFICATION_VISIBLE_SYMBOLS } from 'src/app/domain/constants/stand-in.constants';
import { QualificationOption } from './qualification-option.interface';

@Component({
  selector: 'app-stand-in-qualification-select',
  templateUrl: './stand-in-qualification-select.component.html',
  styleUrls: ['./stand-in-qualification-select.component.scss'],
  standalone: true,
  imports: [NgbDropdownModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StandInQualificationSelectComponent {
  readonly qualifications = input.required<IQualification[]>();
  readonly selectedIds = input.required<ReadonlySet<string>>();
  readonly lang = input.required<Language>();
  readonly toggled = output<string>();

  protected readonly options = computed<QualificationOption[]>(() =>
    this.qualifications()
      .filter((qualification): qualification is IQualification & { id: string } => !!qualification.id)
      .map((qualification) => ({
        id: qualification.id,
        name: getLocalizedValue(qualification.name, this.lang()),
        emoji: qualification.emoji ?? '',
      })),
  );

  protected readonly chosen = computed(() => this.options().filter((option) => this.selectedIds().has(option.id)));
  protected readonly visibleChosen = computed(() => this.chosen().slice(0, STAND_IN_QUALIFICATION_VISIBLE_SYMBOLS));
  protected readonly hiddenCount = computed(() => this.chosen().length - this.visibleChosen().length);
  protected readonly chosenNames = computed(() => this.chosen().map((option) => option.name).join(', '));

  protected isChosen(id: string): boolean {
    return this.selectedIds().has(id);
  }

  protected onToggle(id: string): void {
    this.toggled.emit(id);
  }
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Editor for the synonyms of a single target × locale. Add / remove / approve.
 * @param target - selected target (input signal)
 * @param locale - active locale (input signal)
 */
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { KlacksyTrainingService, NavigationTargetDto } from '../../../../core/services/klacksy-training.service';
import { TrashIconRedComponent } from '../../../icons/trash-icon-red.component';

@Component({
  selector: 'app-klacksy-training-synonym-editor',
  standalone: true,
  imports: [FormsModule, TranslateModule, TrashIconRedComponent],
  templateUrl: './klacksy-training-synonym-editor.component.html',
  styleUrls: ['./klacksy-training-synonym-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KlacksyTrainingSynonymEditorComponent {
  readonly target = input.required<NavigationTargetDto>();
  readonly locale = input.required<string>();
  readonly saved = output<void>();

  private readonly service = inject(KlacksyTrainingService);
  protected newSynonym = '';

  protected synonyms(): string[] { return this.target().synonyms[this.locale()] ?? []; }

  protected add(): void {
    const v = this.newSynonym.trim().toLowerCase();
    if (!v) return;
    this.target().synonyms[this.locale()] = [...this.synonyms(), v];
    this.newSynonym = '';
  }

  protected remove(s: string): void {
    this.target().synonyms[this.locale()] = this.synonyms().filter(x => x !== s);
  }

  protected save(status: 'reviewed' | 'needs-review'): void {
    this.service.updateSynonyms(this.target().targetId, this.locale(), this.synonyms(), status)
      .subscribe(() => this.saved.emit());
  }
}

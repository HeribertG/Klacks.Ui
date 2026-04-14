// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Editor for the synonyms of a single target × locale. Add / remove / approve.
 * @param target - selected target (input signal)
 * @param locale - active locale (input signal)
 */
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { KlacksyTrainingService, NavigationTargetDto } from '../../../../core/services/klacksy-training.service';

@Component({
  selector: 'app-klacksy-training-synonym-editor',
  standalone: true,
  imports: [FormsModule, TranslateModule],
  templateUrl: './klacksy-training-synonym-editor.component.html',
  styleUrls: ['./klacksy-training-synonym-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KlacksyTrainingSynonymEditorComponent {
  @Input({ required: true }) target!: NavigationTargetDto;
  @Input({ required: true }) locale!: string;
  @Output() saved = new EventEmitter<void>();

  private readonly service = inject(KlacksyTrainingService);
  protected newSynonym = '';

  protected synonyms(): string[] { return this.target.synonyms[this.locale] ?? []; }

  protected add(): void {
    const v = this.newSynonym.trim().toLowerCase();
    if (!v) return;
    this.target.synonyms[this.locale] = [...this.synonyms(), v];
    this.newSynonym = '';
  }

  protected remove(s: string): void {
    this.target.synonyms[this.locale] = this.synonyms().filter(x => x !== s);
  }

  protected save(status: 'reviewed' | 'needs-review'): void {
    this.service.updateSynonyms(this.target.targetId, this.locale, this.synonyms(), status)
      .subscribe(() => this.saved.emit());
  }
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Admin view: list of navigation targets with filter + selection, delegates editing
 * to the synonym editor component.
 * @param status - filter signal for synonym status (pending, generated, reviewed, needs-review)
 * @param locale - filter signal for language locale (de, en, fr, it)
 */
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { KlacksyTrainingService, NavigationTargetDto } from '../../../../core/services/klacksy-training.service';
import { KlacksyTrainingSynonymEditorComponent } from '../klacksy-training-synonym-editor/klacksy-training-synonym-editor.component';

@Component({
  selector: 'app-klacksy-training-review',
  standalone: true,
  imports: [FormsModule, TranslateModule, KlacksyTrainingSynonymEditorComponent],
  templateUrl: './klacksy-training-review.component.html',
  styleUrls: ['./klacksy-training-review.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KlacksyTrainingReviewComponent implements OnInit {
  private readonly service = inject(KlacksyTrainingService);
  protected readonly status = signal<string>('');
  protected readonly locale = signal<string>('de');
  protected readonly targets = signal<NavigationTargetDto[]>([]);
  protected readonly selected = signal<NavigationTargetDto | null>(null);

  ngOnInit(): void { this.reload(); }

  protected reload(): void {
    this.service.listTargets(this.status() || undefined, this.locale() || undefined)
      .subscribe(t => this.targets.set(t));
  }

  protected select(t: NavigationTargetDto): void { this.selected.set(t); }

  protected statusKey(s: string): string {
    return s === 'needs-review' ? 'needsReview' : s;
  }
}

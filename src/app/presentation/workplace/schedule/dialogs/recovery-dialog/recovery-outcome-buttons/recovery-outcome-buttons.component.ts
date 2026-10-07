// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * The three response buttons (accepted / declined / not reached) the planner presses after calling a
 * stand-in. Purely presentational: it shows which response is stored and reports a click; the parent
 * dialog saves it.
 * @param name - The stand-in's name, used in the group's accessible label
 * @param activeOutcome - The stored response; its button shows as pressed
 * @param disabled - True while the response is being saved or when there is nothing to save it on
 * @param outcomeSelected - Emits the response the planner clicked
 */
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ReplacementRequestOutcome } from 'src/app/domain/enums/replacement-request-outcome.enum';

interface IOutcomeAction {
  outcome: ReplacementRequestOutcome;
  labelKey: string;
  activeClass: string;
  idleClass: string;
}

const OUTCOME_ACTIONS: readonly IOutcomeAction[] = [
  {
    outcome: ReplacementRequestOutcome.Accepted,
    labelKey: 'recovery.dialog.outcome.accept',
    activeClass: 'btn-success',
    idleClass: 'btn-outline-success',
  },
  {
    outcome: ReplacementRequestOutcome.Declined,
    labelKey: 'recovery.dialog.outcome.decline',
    activeClass: 'btn-danger',
    idleClass: 'btn-outline-danger',
  },
  {
    outcome: ReplacementRequestOutcome.NotReached,
    labelKey: 'recovery.dialog.outcome.notReached',
    activeClass: 'btn-secondary',
    idleClass: 'btn-outline-secondary',
  },
];

@Component({
  selector: 'app-recovery-outcome-buttons',
  templateUrl: './recovery-outcome-buttons.component.html',
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecoveryOutcomeButtonsComponent {
  readonly name = input.required<string>();
  readonly activeOutcome = input<ReplacementRequestOutcome | null>(null);
  readonly disabled = input(false);
  readonly outcomeSelected = output<ReplacementRequestOutcome>();

  protected readonly actions = OUTCOME_ACTIONS;

  protected isActive(action: IOutcomeAction): boolean {
    return this.activeOutcome() === action.outcome;
  }

  protected onSelect(action: IOutcomeAction): void {
    if (!this.disabled()) {
      this.outcomeSelected.emit(action.outcome);
    }
  }
}

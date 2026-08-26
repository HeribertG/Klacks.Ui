// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Status bar pinned above the assistant chat that says whether Klacksy may currently act on its own
 * and offers the emergency stop right there instead of only deep inside the settings. Supervision has
 * to become more visible the further autonomy reaches, so the stopped state is the loud one and the
 * running state stays a single quiet line that does not push the conversation aside.
 * The bar renders for administrators only: the governance endpoint is admin-only in both directions,
 * so a non-administrator cannot even read the switch state, and a control drawn over a state that was
 * never received would be a lie rather than a gate.
 * Wording for the stopped state and for both failure toasts comes from the governance settings keys
 * rather than from new ones: one fact must not be phrased twice in four languages and then drift.
 * The switch is shown inverted to the stored value on purpose: the user decides about autonomy, the
 * server stores the emergency stop, therefore switching the bar off writes the kill switch on.
 * @param autonomyEnabled - True while Klacksy may act on its own, meaning the stored kill switch is off
 * @param isSaving - True while a flip of the switch is on its way to the server
 * @param canRender - True only for administrators, who alone may read and write the governance state
 */

import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, OnInit, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ProactiveGovernanceService } from 'src/app/domain/services/assistant/proactive-governance.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

const LOAD_FAILED_I18N_KEY = 'setting.proactiveGovernance.load-failed';
const SAVE_FAILED_I18N_KEY = 'setting.proactiveGovernance.save-failed';
const TOAST_TITLE_I18N_KEY = 'setting.proactiveGovernance.headline';

@Component({
  selector: 'app-autonomy-status-bar',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './autonomy-status-bar.component.html',
  styleUrls: ['./autonomy-status-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutonomyStatusBarComponent implements OnInit {
  private proactiveGovernanceService = inject(ProactiveGovernanceService);
  private authorizationService = inject(AuthorizationService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);

  readonly canRender = computed(() => this.authorizationService.isAdmin);
  readonly isSaving = signal(false);
  readonly autonomyEnabled = linkedSignal(
    () => !this.proactiveGovernanceService.killSwitchActive()
  );

  async ngOnInit(): Promise<void> {
    if (!this.canRender()) {
      return;
    }

    try {
      await firstValueFrom(this.proactiveGovernanceService.get());
    } catch {
      this.showError(LOAD_FAILED_I18N_KEY);
    }
  }

  async onToggleAutonomy(enabled: boolean): Promise<void> {
    if (this.isSaving() || !this.canRender()) {
      return;
    }

    const previous = this.autonomyEnabled();
    if (previous === enabled) {
      return;
    }

    this.autonomyEnabled.set(enabled);
    this.isSaving.set(true);
    try {
      await firstValueFrom(this.proactiveGovernanceService.update({ killSwitch: !enabled }));
    } catch {
      this.autonomyEnabled.set(previous);
      this.showError(SAVE_FAILED_I18N_KEY);
    } finally {
      this.isSaving.set(false);
    }
  }

  private showError(messageKey: string): void {
    this.toastShowService.showError(
      this.translateService.instant(messageKey),
      this.translateService.instant(TOAST_TITLE_I18N_KEY)
    );
  }
}

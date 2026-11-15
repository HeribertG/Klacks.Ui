// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Settings card for the OAuth connections of external AI tools: mode, local-program and write switches, and the own trusted redirect targets.
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import {
  OAUTH_CONNECTION_MODE,
  OAUTH_CUSTOM_TARGET_MAX_ENTRIES,
} from 'src/app/domain/constants/oauth-connection.constants';
import { IOAuthConnectionSettings } from 'src/app/domain/models/settings/oauth-connection-settings.interface';
import { OAuthConnectionMode } from 'src/app/domain/models/settings/oauth-connection-mode.type';
import { checkNewOAuthCustomTarget } from 'src/app/domain/helpers/oauth-custom-targets.helper';

@Component({
  selector: 'app-oauth-connection-settings',
  templateUrl: './oauth-connection-settings.component.html',
  styleUrls: ['./oauth-connection-settings.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OAuthConnectionSettingsComponent {
  private dataManagementSettingsService = inject(DataManagementSettingsService);

  public readonly settings = this.dataManagementSettingsService.appSettings.oauthConnectionSettings;
  public readonly newTarget = signal('');
  public readonly targetErrorKey = signal<string | null>(null);

  public readonly modeTrusted = OAUTH_CONNECTION_MODE.Trusted;
  public readonly modeOff = OAUTH_CONNECTION_MODE.Off;
  public readonly maxTargets = OAUTH_CUSTOM_TARGET_MAX_ENTRIES;

  public readonly isOff = computed(() => this.settings().mode === OAUTH_CONNECTION_MODE.Off);
  public readonly limitReached = computed(
    () => this.settings().customTargets.length >= OAUTH_CUSTOM_TARGET_MAX_ENTRIES,
  );

  setMode(value: string): void {
    const mode: OAuthConnectionMode =
      value === OAUTH_CONNECTION_MODE.Off ? OAUTH_CONNECTION_MODE.Off : OAUTH_CONNECTION_MODE.Trusted;
    this.update((current) => ({ ...current, mode }));
  }

  setAllowLoopback(allowLoopback: boolean): void {
    this.update((current) => ({ ...current, allowLoopback }));
  }

  setAllowWrite(allowWrite: boolean): void {
    this.update((current) => ({ ...current, allowWrite }));
  }

  onTargetInput(value: string): void {
    this.newTarget.set(value);
    this.targetErrorKey.set(null);
  }

  addTarget(): void {
    const check = checkNewOAuthCustomTarget(this.settings().customTargets, this.newTarget());
    if (check.errorKey !== null) {
      this.targetErrorKey.set(check.errorKey);
      return;
    }
    this.update((current) => ({ ...current, customTargets: [...current.customTargets, check.canonical] }));
    this.newTarget.set('');
    this.targetErrorKey.set(null);
  }

  removeTarget(target: string): void {
    this.update((current) => ({
      ...current,
      customTargets: current.customTargets.filter((entry) => entry !== target),
    }));
  }

  private update(change: (current: IOAuthConnectionSettings) => IOAuthConnectionSettings): void {
    this.settings.update(change);
    this.dataManagementSettingsService.settingsChangeTrigger.update((value) => value + 1);
  }
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LanguagePluginInfo } from 'src/app/domain/models/settings/language-plugin';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

@Component({
  selector: 'app-language-plugins-row',
  standalone: true,
  imports: [DecimalPipe, TranslateModule, TrashIconRedComponent],
  templateUrl: './language-plugins-row.component.html',
  styleUrls: ['./language-plugins-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguagePluginsRowComponent {

  readonly data = input.required<LanguagePluginInfo>();
  readonly installEvent = output<LanguagePluginInfo>();
  readonly uninstallEvent = output<LanguagePluginInfo>();

  getStatusKey(): string {
    if (this.data().isCore) return 'settings.language-plugins.status.core';
    if (this.data().isInstalled) return 'settings.language-plugins.status.installed';
    return 'settings.language-plugins.status.available';
  }

  getStatusClass(): string {
    if (this.data().isCore) return 'status-core';
    if (this.data().isInstalled) return 'status-installed';
    return 'status-available';
  }

  onInstall(): void {
    this.installEvent.emit(this.data());
  }

  onUninstall(): void {
    this.uninstallEvent.emit(this.data());
  }
}

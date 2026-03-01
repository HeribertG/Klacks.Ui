// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguagePluginInfo } from 'src/app/domain/models/settings/language-plugin';

@Component({
  selector: 'app-language-plugins-row',
  standalone: true,
  imports: [DecimalPipe, TranslateModule],
  templateUrl: './language-plugins-row.component.html',
  styleUrls: ['./language-plugins-row.component.scss']
})
export class LanguagePluginsRowComponent {
  translate = inject(TranslateService);

  @Input() data!: LanguagePluginInfo;
  @Output() installEvent = new EventEmitter<LanguagePluginInfo>();
  @Output() uninstallEvent = new EventEmitter<LanguagePluginInfo>();

  getStatusKey(): string {
    if (this.data.isCore) return 'settings.language-plugins.status.core';
    if (this.data.isInstalled) return 'settings.language-plugins.status.installed';
    return 'settings.language-plugins.status.available';
  }

  getStatusClass(): string {
    if (this.data.isCore) return 'status-core';
    if (this.data.isInstalled) return 'status-installed';
    return 'status-available';
  }

  onInstall(): void {
    this.installEvent.emit(this.data);
  }

  onUninstall(): void {
    this.uninstallEvent.emit(this.data);
  }
}

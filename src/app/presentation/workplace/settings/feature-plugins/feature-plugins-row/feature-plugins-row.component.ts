// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Row component displaying a single feature plugin with actions.
 * @param data - The feature plugin info to display
 * @param installEvent - Emitted when the install button is clicked
 * @param uninstallEvent - Emitted when the uninstall button is clicked
 * @param toggleEnabledEvent - Emitted when the enable/disable toggle is clicked
 */
import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { FeaturePluginInfo } from 'src/app/domain/models/plugins/feature-plugin-info';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

@Component({
  selector: 'app-feature-plugins-row',
  standalone: true,
  imports: [TranslateModule, TrashIconRedComponent],
  templateUrl: './feature-plugins-row.component.html',
  styleUrls: ['./feature-plugins-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturePluginsRowComponent {

  @Input() data!: FeaturePluginInfo;
  @Output() installEvent = new EventEmitter<FeaturePluginInfo>();
  @Output() uninstallEvent = new EventEmitter<FeaturePluginInfo>();
  @Output() toggleEnabledEvent = new EventEmitter<FeaturePluginInfo>();

  getStatusKey(): string {
    if (!this.data.isInstalled) return 'settings.feature-plugins.status.available';
    if (this.data.isEnabled) return 'settings.feature-plugins.status.enabled';
    return 'settings.feature-plugins.status.disabled';
  }

  getStatusClass(): string {
    if (!this.data.isInstalled) return 'status-available';
    if (this.data.isEnabled) return 'status-enabled';
    return 'status-disabled';
  }

  onInstall(): void {
    this.installEvent.emit(this.data);
  }

  onUninstall(): void {
    this.uninstallEvent.emit(this.data);
  }

  onToggleEnabled(): void {
    this.toggleEnabledEvent.emit(this.data);
  }
}

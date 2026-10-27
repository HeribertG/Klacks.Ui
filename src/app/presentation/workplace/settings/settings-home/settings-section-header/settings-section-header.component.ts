// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Collapsible section header of the settings page: shows the translated section title and the expand/collapse arrow
 * and reports clicks and Enter presses, while the page keeps the expanded state of every section.
 * @param titleKey - Translation key of the section title
 * @param expanded - Whether the section below the header is currently expanded
 * @param toggled - Emits when the user clicks the header or presses Enter on it
 */
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';

@Component({
  selector: 'app-settings-section-header',
  templateUrl: './settings-section-header.component.html',
  styleUrl: './settings-section-header.component.scss',
  standalone: true,
  imports: [TranslateModule, IconAngleDownComponent, IconAngleRightComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsSectionHeaderComponent {
  readonly titleKey = input.required<string>();
  readonly expanded = input.required<boolean>();
  readonly toggled = output<void>();
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Header row component for the feature plugins table.
 */
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-feature-plugins-header',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './feature-plugins-header.component.html',
  styleUrls: ['./feature-plugins-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturePluginsHeaderComponent {
}

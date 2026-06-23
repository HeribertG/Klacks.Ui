// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy, inject, signal, effect, input, untracked } from '@angular/core';

import { form, FormField, debounce } from '@angular/forms/signals';
import { TranslateModule } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ISetting } from 'src/app/domain/models/settings/settings-various-class';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';

@Component({
  selector: 'app-grid-color-row',
  templateUrl: './grid-color-row.component.html',
  styleUrls: ['./grid-color-row.component.scss'],
  standalone: true,
  imports: [TranslateModule, NgbModule, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GridColorRowComponent {
  readonly data = input<ISetting | undefined>(undefined);
  private gridColorService = inject(GridColorService);

  private colorModel = signal({ color: '#000000' });
  colorForm = form(this.colorModel, (f) => {
    debounce(f.color, 800);
  });

  constructor() {
    effect(() => {
      const setting = this.data();
      if (setting) {
        this.colorModel.set({ color: setting.value });
      }
    });

    effect(() => {
      const color = this.colorModel().color;
      const setting = untracked(() => this.data());
      if (setting && color !== setting.value) {
        setting.value = color;
        this.gridColorService.save();
      }
    });
  }
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, Input, inject, signal, effect, OnChanges } from '@angular/core';

import { form, Field, debounce } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ISetting } from 'src/app/domain/models/settings/settings-various-class';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';

@Component({
  selector: 'app-grid-color-row',
  templateUrl: './grid-color-row.component.html',
  styleUrls: ['./grid-color-row.component.scss'],
  standalone: true,
  imports: [TranslateModule, NgbModule, Field],
})
export class GridColorRowComponent implements OnChanges {
  @Input() data: ISetting | undefined;

  public translate = inject(TranslateService);
  private gridColorService = inject(GridColorService);

  private colorModel = signal({ color: '#000000' });
  colorForm = form(this.colorModel, (f) => {
    debounce(f.color, 800);
  });

  constructor() {
    effect(() => {
      const color = this.colorModel().color;
      if (this.data && color !== this.data.value) {
        this.data.value = color;
        this.gridColorService.save();
      }
    });
  }

  ngOnChanges(): void {
    if (this.data) {
      this.colorModel.set({ color: this.data.value });
    }
  }
}

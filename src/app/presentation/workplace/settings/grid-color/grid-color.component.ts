// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, OnInit, inject } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { GridColorHeaderComponent } from './grid-color-header/grid-color-header.component';
import { GridColorRowComponent } from './grid-color-row/grid-color-row.component';

import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';

@Component({
  selector: 'app-grid-color',
  templateUrl: './grid-color.component.html',
  styleUrls: ['./grid-color.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    NgbModule,
    SpinnerModule,
    GridColorHeaderComponent,
    GridColorRowComponent
],
})
export class GridColorComponent implements OnInit {
  public translate = inject(TranslateService);
  public gridColorService = inject(GridColorService);

  async ngOnInit(): Promise<void> {
    await this.gridColorService.readDataAsync();
  }
}

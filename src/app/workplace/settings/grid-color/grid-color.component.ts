import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from 'src/app/shared/shared.module';
import { SpinnerModule } from 'src/app/spinner/spinner.module';
import { GridColorHeaderComponent } from './grid-color-header/grid-color-header.component';
import { GridColorRowComponent } from './grid-color-row/grid-color-row.component';

import { GridColorService } from 'src/app/grid/services/grid-color.service';

@Component({
  selector: 'app-grid-color',
  templateUrl: './grid-color.component.html',
  styleUrls: ['./grid-color.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    NgbModule,
    SharedModule,
    SpinnerModule,
    GridColorHeaderComponent,
    GridColorRowComponent,
  ],
})
export class GridColorComponent implements OnInit {
  @Output() isChangingEvent = new EventEmitter<boolean>();

  public translate = inject(TranslateService);
  public gridColorService = inject(GridColorService);

  ngOnInit(): void {
    this.gridColorService.readData();
  }

  onIsChanging(value: boolean): void {
    this.isChangingEvent.emit(value);
  }
}

import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { IconsModule } from 'src/app/icons/icons.module';
import { SharedModule } from 'src/app/shared/shared.module';

import { ISetting } from 'src/app/core/settings-various-class';
import { GridColorService } from 'src/app/grid/services/grid-color.service';

@Component({
  selector: 'app-grid-color-row',
  templateUrl: './grid-color-row.component.html',
  styleUrls: ['./grid-color-row.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NgbModule,
    IconsModule,
    SharedModule,
  ],
})
export class GridColorRowComponent implements OnInit {
  @Input() data: ISetting | undefined;
  @Output() isChangingEvent = new EventEmitter<true>();

  public translate = inject(TranslateService);
  private gridColorService = inject(GridColorService);

  ngOnInit(): void {}

  onChange(event: Event): void {
    if (this.data && event.target) {
      const inputElement = event.target as HTMLInputElement;
      this.data.value = inputElement.value;
    }
    this.isChangingEvent.emit(true);
  }
}

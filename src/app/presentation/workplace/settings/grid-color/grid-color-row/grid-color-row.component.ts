import { Component, Input, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ISetting } from 'src/app/domain/models/settings-various-class';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';

@Component({
  selector: 'app-grid-color-row',
  templateUrl: './grid-color-row.component.html',
  styleUrls: ['./grid-color-row.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule, NgbModule],
})
export class GridColorRowComponent {
  @Input() data: ISetting | undefined;

  public translate = inject(TranslateService);
  private gridColorService = inject(GridColorService);
  private saveTimeout: ReturnType<typeof setTimeout> | undefined;

  onChange(event: Event): void {
    if (this.data && event.target) {
      const inputElement = event.target as HTMLInputElement;
      this.data.value = inputElement.value;
    }

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.gridColorService.save();
    }, 800);
  }
}

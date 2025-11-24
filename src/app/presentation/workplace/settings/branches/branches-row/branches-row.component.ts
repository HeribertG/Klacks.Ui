import { Component, Input, Output, EventEmitter, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IBranch } from 'src/app/domain/models/branch';

@Component({
  selector: 'app-branches-row',
  standalone: true,
  imports: [FormsModule, TranslateModule],
  templateUrl: './branches-row.component.html',
  styleUrls: ['./branches-row.component.scss'],
})
export class BranchesRowComponent {
  translate = inject(TranslateService);

  @Input() data!: IBranch;
  @Output() editEvent = new EventEmitter<IBranch>();
  @Output() isDeleteEvent = new EventEmitter<void>();

  onClickEdit(): void {
    this.editEvent.emit(this.data);
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit();
  }
}

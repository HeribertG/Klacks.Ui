import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DataManagementShiftService } from 'src/app/data/management/data-management-shift.service';
import { IconAngleDownComponent } from 'src/app/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/icons/icon-angle-right.component';

@Component({
  selector: 'app-edit-shift-special-feature',
  templateUrl: './edit-shift-special-feature.component.html',
  styleUrls: ['./edit-shift-special-feature.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    IconAngleDownComponent,
    IconAngleRightComponent,
  ],
})
export class EditShiftSpecialFeatureComponent {
  @Output() isChangingEvent = new EventEmitter<boolean>();

  @ViewChild('specialFeatureShiftForm', { static: false })
  specialFeatureShiftForm: NgForm | undefined;

  public dataManagementShiftService = inject(DataManagementShiftService);

  visibleTable = 'inline';

  onClickVisibleTable() {
    this.visibleTable = this.visibleTable == 'inline' ? 'none' : 'inline';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onKeyUpInput(event: any, data: string) {
    event.currentTarget.value = data;
    this.isChangingEvent.emit(true);
  }
}

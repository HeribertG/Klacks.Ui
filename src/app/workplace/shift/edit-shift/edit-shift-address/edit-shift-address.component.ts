import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DataManagementShiftService } from 'src/app/data/management/data-management-shift.service';
import { IconAngleDownComponent } from 'src/app/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/icons/icon-angle-right.component';

@Component({
  selector: 'app-edit-shift-address',
  templateUrl: './edit-shift-address.component.html',
  styleUrls: ['./edit-shift-address.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    IconAngleDownComponent,
    IconAngleRightComponent,
  ],
})
export class EditShiftAddressComponent {
  @Output() isChangingEvent = new EventEmitter<boolean>();

  @ViewChild('addressShiftForm', { static: false }) addressShiftForm:
    | NgForm
    | undefined;

  visibleTable = 'inline';

  constructor(public dataManagementShiftService: DataManagementShiftService) {}

  onClickVisibleTable() {
    this.visibleTable = this.visibleTable == 'inline' ? 'none' : 'inline';
  }
}

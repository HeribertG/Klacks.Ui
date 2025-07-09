import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  EventEmitter,
  inject,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
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
export class EditShiftSpecialFeatureComponent
  implements AfterViewInit, OnDestroy
{
  @Output() isChangingEvent = new EventEmitter<boolean>();

  @ViewChild('specialFeatureShiftForm', { static: false })
  specialFeatureShiftForm: NgForm | undefined;

  public dataManagementShiftService = inject(DataManagementShiftService);

  visibleTable = 'inline';
  public isSumEmployeesValid: boolean | undefined;
  public isQuantityValid: boolean | undefined;

  private objectForUnsubscribe: Subscription | undefined;

  ngAfterViewInit(): void {
    this.objectForUnsubscribe =
      this.specialFeatureShiftForm!.valueChanges!.subscribe(() => {
        if (this.specialFeatureShiftForm!.dirty === true) {
          setTimeout(() => this.validateNumberInputs(), 100);
        }
      });
  }

  ngOnDestroy(): void {
    if (this.objectForUnsubscribe) {
      this.objectForUnsubscribe.unsubscribe();
    }
  }

  onClickVisibleTable() {
    this.visibleTable = this.visibleTable == 'inline' ? 'none' : 'inline';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onKeyUpInput(event: any, data: string) {
    event.currentTarget.value = data;
    this.isChangingEvent.emit(true);
  }

  onNumberChange() {
    this.isChangingEvent.emit(true);
    this.validateNumberInputs();
  }

  private validateNumberInputs() {
    this.validateSumEmployees();
    this.validateQuantity();
  }

  private validateSumEmployees() {
    this.isSumEmployeesValid = undefined;

    const sumEmployees =
      this.dataManagementShiftService.editShift?.sumEmployees;

    if (sumEmployees === undefined || sumEmployees === null) {
      this.isSumEmployeesValid = false;
    } else if (sumEmployees <= 0) {
      this.isSumEmployeesValid = false;
    } else {
      this.isSumEmployeesValid = true;
    }
  }

  private validateQuantity() {
    this.isQuantityValid = undefined;

    const quantity = this.dataManagementShiftService.editShift?.quantity;

    if (quantity === undefined || quantity === null) {
      this.isQuantityValid = false;
    } else if (quantity <= 0) {
      this.isQuantityValid = false;
    } else {
      this.isQuantityValid = true;
    }
  }
}

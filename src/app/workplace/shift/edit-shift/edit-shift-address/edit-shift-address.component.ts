import {
  AfterViewInit,
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { DataManagementShiftService } from 'src/app/data/management/data-management-shift.service';

@Component({
  selector: 'app-edit-shift-address',
  templateUrl: './edit-shift-address.component.html',
  styleUrls: ['./edit-shift-address.component.scss'],
})
export class EditShiftAddressComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Output() isChangingEvent = new EventEmitter<boolean>();

  @ViewChild('addressShiftForm', { static: false }) addressShiftForm:
    | NgForm
    | undefined;

  visibleTable = 'inline';

  constructor(public dataManagementShiftService: DataManagementShiftService) {}

  ngOnInit(): void {}
  ngAfterViewInit(): void {}
  ngOnDestroy(): void {}

  onClickVisibleTable() {
    this.visibleTable = this.visibleTable == 'inline' ? 'none' : 'inline';
  }
}

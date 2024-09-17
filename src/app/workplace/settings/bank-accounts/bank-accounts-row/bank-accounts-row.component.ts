import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { BankDetail } from 'src/app/core/bank-detail-class';
import { DataManagementSettingsService } from 'src/app/data/management/data-management-settings.service';
import { CreateEntriesEnum } from 'src/app/helpers/enums/client-enum';

@Component({
  selector: 'app-bank-accounts-row',
  templateUrl: './bank-accounts-row.component.html',
  styleUrls: ['./bank-accounts-row.component.scss'],
})
export class BankAccountsRowComponent implements OnInit {
  @Output() isChangingEvent = new EventEmitter<boolean>();
  @ViewChild('bankForm', { static: false }) bankForm: NgForm | undefined;
  @Input() bankDetail: BankDetail | undefined;
  @Input() public position: number | undefined;
  @Input() public isFocusIndex: number | undefined;

  objectForUnsubscribe: any;

  addStreetLine2 = false;
  addStreetLine3 = false;

  constructor(
    public dataManagementSettingsService: DataManagementSettingsService
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.assemblyAddress();
    this.objectForUnsubscribe = this.bankForm!.valueChanges!.subscribe((x) => {
      if (this.bankForm!.dirty) {
        if (
          this.bankDetail!.isDirty === undefined ||
          this.bankDetail!.isDirty === CreateEntriesEnum.undefined
        ) {
          this.bankDetail!.isDirty = CreateEntriesEnum.rewrite;
        }

        this.isChangingEvent.emit(true);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.objectForUnsubscribe) {
      this.objectForUnsubscribe.unsubscribe();
    }
  }

  assemblyAddress() {
    if (this.bankDetail!.street2) {
      if (this.bankDetail!.street2 !== '') {
        this.addStreetLine2 = true;
      }
    }

    if (this.bankDetail!.street3) {
      if (this.bankDetail!.street3 !== '') {
        this.addStreetLine3 = true;
      }
    }
  }
}

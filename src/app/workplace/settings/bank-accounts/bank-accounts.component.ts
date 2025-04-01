import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { BankDetail, IBankDetail } from 'src/app/core/bank-detail-class';
import { DataManagementSettingsService } from 'src/app/data/management/data-management-settings.service';
import { CreateEntriesEnum } from 'src/app/helpers/enums/client-enum';

import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/spinner/spinner.module';
import { SharedModule } from 'src/app/shared/shared.module';
import { BankAccountsRowComponent } from './bank-accounts-row/bank-accounts-row.component';

@Component({
  selector: 'app-bank-accounts',
  templateUrl: './bank-accounts.component.html',
  styleUrls: ['./bank-accounts.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    NgbModule,
    SpinnerModule,
    SharedModule,
    BankAccountsRowComponent,
  ],
})
export class BankAccountsComponent implements OnInit {
  @Output() isChangingEvent = new EventEmitter<boolean>();

  public dataManagementSettingsService = inject(DataManagementSettingsService);
  public translate = inject(TranslateService);

  ngOnInit(): void {}

  onIsChanging(event: any) {
    setTimeout(() => this.isChangingEvent.emit(event), 100);
  }
  onFocus(position: number) {
    this.dataManagementSettingsService.isBankDetailRowFocusIndex = position;
  }

  onAdd() {
    const c = new BankDetail();
    c.position = this.dataManagementSettingsService.bankDetailList.length;
    c.isDirty = CreateEntriesEnum.new;
    this.dataManagementSettingsService.bankDetailList.push(c);
  }

  onDelete() {
    this.dataManagementSettingsService.bankDetailList[
      this.dataManagementSettingsService.isBankDetailRowFocusIndex
    ].isDirty = CreateEntriesEnum.delete;
    this.dataManagementSettingsService.bankDetailList[
      this.dataManagementSettingsService.isBankDetailRowFocusIndex
    ].name =
      this.dataManagementSettingsService.bankDetailList[
        this.dataManagementSettingsService.isBankDetailRowFocusIndex
      ].name + '--isDeleted';
    this.dataManagementSettingsService.isBankDetailRowFocusIndex = -1;
    this.onIsChanging(true);
  }
}

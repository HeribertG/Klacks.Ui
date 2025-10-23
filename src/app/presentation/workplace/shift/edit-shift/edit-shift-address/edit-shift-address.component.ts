/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  inject,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { IClient } from 'src/app/domain/models/client-class';
import { DataClientService } from 'src/app/infrastructure/api/data-client.service';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { isNumeric } from 'src/app/domain/helpers/format-helper';
import { ShiftStatus } from 'src/app/domain/models/shift-class';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

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
    TrashIconRedComponent,
  ],
})
export class EditShiftAddressComponent implements OnInit {
  @Output() isChangingEvent = new EventEmitter<boolean>();

  @ViewChild('addressShiftForm', { static: false }) addressShiftForm:
    | NgForm
    | undefined;

  @HostListener('search', ['$event']) onsearch(event: any) {
    if (!this.selectedClientName) {
      this.clearSelection();
      return;
    }
  }

  public dataManagementShiftService = inject(DataManagementShiftService);
  private dataClientService = inject(DataClientService);

  result = new Array<IClient>();
  visibleTable = 'inline';
  selectedClientName = '';
  selectedClient: IClient | undefined = undefined;

  ngOnInit(): void {
    this.setFilter();
  }

  get isFieldsDisabled(): boolean {
    const status = this.dataManagementShiftService.editShift?.status;
    return status !== undefined && status !== ShiftStatus.OriginalOrder;
  }

  onClickVisibleTable() {
    this.visibleTable = this.visibleTable == 'inline' ? 'none' : 'inline';
  }

  onIsChanging(event: any) {
    this.isChangingEvent.emit(event);
  }
  onKeyupSearchField(event: KeyboardEvent) {
    if (this.isFieldsDisabled) {
      return;
    }
    
    event.preventDefault();
    event.stopPropagation();

    if (event.key === 'Enter') {
      this.applyClient();
    }

    if (isNumeric(this.selectedClientName)) {
      this.searchText(true);
      return;
    }

    if (this.selectedClientName && this.selectedClientName.length >= 3) {
      this.searchText();
      return;
    }

    setTimeout(() => {
      this.searchText();
    }, 2000);
  }

  onKeydownEnterSearchField(event: KeyboardEvent) {
    if (this.isFieldsDisabled) {
      return;
    }
    
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();

      if (isNumeric(this.selectedClientName)) {
        this.searchText(true);
        return;
      }

      this.applyClient();
    }
  }

  onClickApply() {
    if (this.isFieldsDisabled) {
      return;
    }
    this.applyClient();
  }

  onRemoveAddress() {
    if (this.isFieldsDisabled) {
      return;
    }
    
    if (this.dataManagementShiftService.editShift) {
      this.dataManagementShiftService.editShift.clientId = undefined;
      this.dataManagementShiftService.editShift.addressName = undefined;
      this.onIsChanging(true);
    }
  }

  private searchText(isNummer = false) {
    if (
      this.selectedClientName &&
      (this.selectedClientName.toString().length >= 2 || isNummer)
    ) {
      const split = this.selectedClientName.toString().split(' - ');

      if (split.length >= 1 && isNumeric(split[0])) {
        this.refreshList(split[0]);
      } else {
        this.refreshList(this.selectedClientName);
      }
    }
  }

  private refreshList(term: string) {
    this.dataManagementShiftService.currentClientFilter.searchString = term;

    this.dataClientService
      .readClientList(this.dataManagementShiftService.currentClientFilter)
      .subscribe((x) => {
        this.result = x.clients;

        if (this.result.length === 1) {
          this.selectedClient = this.result[0];
          const tmpClientName = this.visualName(this.result[0]);
          if (!tmpClientName.includes(this.selectedClientName))
            this.selectedClientName = this.visualName(this.result[0]);
        }
      });
  }

  private applyClient() {
    if (this.selectedClient && this.dataManagementShiftService.editShift) {
      // For shift address, we only allow one address to be selected
      this.dataManagementShiftService.editShift.clientId =
        this.selectedClient.id;
      this.dataManagementShiftService.editShift.addressName = this.visualName(
        this.selectedClient
      );

      this.clearSelection();
      this.onIsChanging(true);
    }
  }

  private clearSelection() {
    this.selectedClient = undefined;
    this.selectedClientName = '';
    this.result = [];
  }

  private visualName(value: IClient): string {
    if (!this.selectedClient) {
      return '';
    }

    return `${value.idNumber} - ${value.company} ${value.firstName} ${value.name}`;
  }

  private setFilter() {
    this.dataManagementShiftService.currentClientFilter.numberOfItemsPerPage = 20;
    this.dataManagementShiftService.currentClientFilter.firstItemOnLastPage = 0;
  }
}

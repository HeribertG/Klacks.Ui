/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  inject,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { IClient } from 'src/app/core/client-class';
import { DataClientService } from 'src/app/data/data-client.service';
import { DataManagementGroupService } from 'src/app/data/management/data-management-group.service';
import { DataManagementShiftService } from 'src/app/data/management/data-management-shift.service';
import { isNumeric } from 'src/app/helpers/format-helper';
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

  @HostListener('search', ['$event']) onsearch(event: any) {
    if (!this.selectedClientName) {
      this.clearSelection();
      return;
    }
  }

  public dataManagementShiftService = inject(DataManagementShiftService);
  public dataManagementGroupService = inject(DataManagementGroupService);
  private dataClientService = inject(DataClientService);

  result = new Array<IClient>();
  visibleTable = 'inline';
  selectedClientName = '';
  selectedClient: IClient | undefined = undefined;

  onClickVisibleTable() {
    this.visibleTable = this.visibleTable == 'inline' ? 'none' : 'inline';
  }

  onIsChanging(event: any) {
    this.isChangingEvent.emit(event);
  }
  onKeyupSearchField(event: KeyboardEvent) {
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
    this.applyClient();
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
    this.dataManagementGroupService.currentClientFilter.searchString = term;

    this.dataClientService
      .readClientList(this.dataManagementGroupService.currentClientFilter)
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
    if (this.selectedClient) {
      const id = this.selectedClient.id;

      const result = this.dataManagementGroupService.editGroup?.groupItems.find(
        (x) => x.clientId === id
      );

      if (!result) {
        this.dataManagementGroupService.add(this.selectedClient);
        this.clearSelection();
        this.onIsChanging(true);
      }
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
}

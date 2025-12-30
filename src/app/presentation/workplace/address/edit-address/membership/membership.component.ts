/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AfterViewInit,
  Component,
  effect,
  EventEmitter,
  inject,
  Injector,
  Input,
  Output,
  runInInjectionContext,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { NgbModule, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { transformNgbDateStructToDate, transformDateToNgbDateStruct } from 'src/app/shared/helpers/ngb-date.helper';
import { ExpandableCardComponent } from 'src/app/presentation/shared/expandable-card/expandable-card.component';
import { toNumber } from 'src/app/shared/helpers/number.helper';

@Component({
  selector: 'app-membership',
  templateUrl: './membership.component.html',
  styleUrls: ['./membership.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    FontAwesomeModule,
    NgbModule,
    ExpandableCardComponent,
  ],
})
export class MembershipComponent implements AfterViewInit, OnDestroy {
  @ViewChild('membershipForm', { static: false }) membershipForm:
    | NgForm
    | undefined;
  @Input() isReadOnly = false;
  @Output() isChangingEvent = new EventEmitter<boolean>();

  public faCalendar = faCalendar;
  public now = new Date();
  public objectForUnsubscribe: any;
  public isValidFromValid: boolean | undefined;

  public authorizationService = inject(AuthorizationService);
  public dataManagementClientService = inject(DataManagementClientService);
  private injector = inject(Injector);

  ngAfterViewInit(): void {
    this.objectForUnsubscribe = this.membershipForm!.valueChanges!.subscribe(
      () => {
        if (this.membershipForm!.dirty === true) {
          setTimeout(() => this.isChangingEvent.emit(true), 100);
        }
      }
    );

    runInInjectionContext(this.injector, () => {
      effect(() => {
        const client = this.dataManagementClientService.editClient();
        if (client) {
          this.calcValidation();
        }
      });
    });
  }

  ngOnDestroy(): void {
    if (this.objectForUnsubscribe) {
      this.objectForUnsubscribe.unsubscribe();
    }
  }

  isDisabled(): boolean {
    return (
      this.isReadOnly ||
      this.dataManagementClientService.editClientDeleted() ||
      !this.authorizationService.isAdmin
    );
  }

  get internalValidFrom(): NgbDateStruct | undefined {
    const date = this.dataManagementClientService.editClient()?.membership?.validFrom;
    return date ? transformDateToNgbDateStruct(date) : undefined;
  }

  set internalValidFrom(value: NgbDateStruct | undefined) {
    const client = this.dataManagementClientService.editClient();
    if (client?.membership && value) {
      const date = transformNgbDateStructToDate(value);
      if (date) {
        client.membership.validFrom = date;
      }
    }
  }

  get internalValidUntil(): NgbDateStruct | undefined {
    const date = this.dataManagementClientService.editClient()?.membership?.validUntil;
    return date ? transformDateToNgbDateStruct(date) : undefined;
  }

  set internalValidUntil(value: NgbDateStruct | undefined) {
    const client = this.dataManagementClientService.editClient();
    if (client?.membership) {
      client.membership.validUntil = value ? transformNgbDateStructToDate(value) : undefined;
    }
  }

  onClientTypeChange(newType: number | string): void {
    this.dataManagementClientService.clientEditService.editClient.update(client => {
      if (client) {
        return { ...client, type: toNumber(newType) };
      }
      return client;
    });
  }

  public calcValidation(): void {
    const client = this.dataManagementClientService.editClient();
    if (!client || !client.membership) {
      return;
    }

    const validFrom = client.membership.validFrom;
    this.isValidFromValid = validFrom ? true : false;
  }
}

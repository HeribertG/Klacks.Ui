/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AfterViewInit,
  Component,
  EventEmitter,
  inject,
  Output,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { DataManagementClientService } from 'src/app/data/management/data-management-client.service';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthorizationService } from 'src/app/services/authorization.service';

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
  ],
})
export class MembershipComponent implements AfterViewInit, OnDestroy {
  @ViewChild('membershipForm', { static: false }) membershipForm:
    | NgForm
    | undefined;
  @Output() isChangingEvent = new EventEmitter<boolean>();

  public faCalendar = faCalendar;
  public now = new Date();
  public objectForUnsubscribe: any;

  public authorizationService = inject(AuthorizationService);
  public dataManagementClientService = inject(DataManagementClientService);

  ngAfterViewInit(): void {
    this.objectForUnsubscribe = this.membershipForm!.valueChanges!.subscribe(
      () => {
        if (this.membershipForm!.dirty === true) {
          setTimeout(() => this.isChangingEvent.emit(true), 100);
        }
      }
    );
  }

  ngOnDestroy(): void {
    if (this.objectForUnsubscribe) {
      this.objectForUnsubscribe.unsubscribe();
    }
  }

  isDisabled(): boolean {
    return (
      this.dataManagementClientService.editClientDeleted ||
      !this.authorizationService.isAuthorised
    );
  }

  onChangeDateBack(event: any) {
    if (event) {
      if (
        typeof event === 'object' &&
        event.hasOwnProperty('year') &&
        event.hasOwnProperty('month') &&
        event.hasOwnProperty('day')
      ) {
        if (
          event.year.toString().lenght === 4 &&
          event.month.toString().lenght === 2 &&
          event.day.toString().lenght === 2
        ) {
          return new Date(event.year, event.month - 1, event.day);
        }
        return event;
      } else {
        return event;
      }
    }
    return null;
  }
}

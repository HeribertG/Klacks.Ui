import {
  Component,
  EventEmitter,
  inject,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { DataManagementClientService } from 'src/app/data/management/data-management-client.service';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-membership',
  templateUrl: './membership.component.html',
  styleUrls: ['./membership.component.scss'],
  standalone: false,
})
export class MembershipComponent implements OnInit {
  @ViewChild('membershipForm', { static: false }) membershipForm:
    | NgForm
    | undefined;
  @Output() isChangingEvent = new EventEmitter<boolean>();

  public faCalendar = faCalendar;
  public isAuthorised = false;
  public now = new Date();
  public objectForUnsubscribe: any;

  public dataManagementClientService = inject(DataManagementClientService);
  private localStorageService = inject(LocalStorageService);

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.objectForUnsubscribe = this.membershipForm!.valueChanges!.subscribe(
      () => {
        if (this.membershipForm!.dirty === true) {
          setTimeout(() => this.isChangingEvent.emit(true), 100);
        }
      }
    );

    if (this.localStorageService.get(MessageLibrary.TOKEN_AUTHORISED)) {
      this.isAuthorised = JSON.parse(
        this.localStorageService.get(MessageLibrary.TOKEN_AUTHORISED)!
      );
    }
  }

  ngOnDestroy(): void {
    if (this.objectForUnsubscribe) {
      this.objectForUnsubscribe.unsubscribe();
    }
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

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AfterViewInit,
  Component,
  effect,
  EventEmitter,
  inject,
  Injector,
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
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { transformNgbDateStructToDate } from 'src/app/domain/helpers/format-helper';

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
    IconAngleRightComponent,
    IconAngleDownComponent,
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
  public visibleTable = 'inline';
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
      this.dataManagementClientService.editClientDeleted() ||
      !this.authorizationService.isAuthorised
    );
  }

  onClickVisibleTable() {
    this.visibleTable = this.visibleTable == 'inline' ? 'none' : 'inline';
  }

  public calcValidation(): void {
    const client = this.dataManagementClientService.editClient();
    if (!client || !client.membership) {
      return;
    }

    const validFrom = transformNgbDateStructToDate(
      client.membership.internalValidFrom
    );
    this.isValidFromValid = validFrom ? true : false;
  }
}

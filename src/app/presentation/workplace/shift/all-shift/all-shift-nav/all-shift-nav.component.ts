// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  AfterViewInit,
  Component,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { Language } from 'src/app/application/helpers/sharedItems';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';

@Component({
  selector: 'app-all-shift-nav',
  templateUrl: './all-shift-nav.component.html',
  styleUrl: './all-shift-nav.component.scss',
  standalone: true,
  imports: [FormsModule, NgbDropdownModule, TranslateModule],
})
export class AllShiftNavComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('navShiftForm', { static: false }) navGroupForm:
    | NgForm
    | undefined;
  navClient: HTMLElement | undefined;

  public dataManagementShiftService = inject(DataManagementShiftService);
  public authorizationService = inject(AuthorizationService);
  private translateService = inject(TranslateService);
  private workplaceStateService = inject(WorkplaceStateService);

  currentLang: Language = DomainMessages.DEFAULT_LANG;
  private ngUnsubscribe = new Subject<void>();
  objectForUnsubscribe: any;

  isComboBoxOpen = false;

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;
    this.checkAdminPermissions();
  }

  ngAfterViewInit(): void {
    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
      });
  }

  ngOnDestroy(): void {
    if (this.objectForUnsubscribe) {
      this.objectForUnsubscribe.unsubscribe();
    }
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  onClose() {
    this.dataManagementShiftService.readPage(false);
  }

  private checkAdminPermissions(): void {
    if (!this.authorizationService.isAdmin) {
      this.dataManagementShiftService.currentFilter.filterType = 1;
    }
  }

  onSelect(): void {
    this.dataManagementShiftService.readPage();
    this.workplaceStateService.isFocusChanged.set(true);
  }
}

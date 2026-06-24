// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Navigation filter component for the group list (validity date range filters).
 */

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { Language } from 'src/app/domain/models/settings/language-config';
import { DomainMessages } from 'src/app/domain/constants/messages';

interface AllGroupNavFilterModel {
  activeDateRange: boolean;
  formerDateRange: boolean;
  futureDateRange: boolean;
}

@Component({
  selector: 'app-all-group-nav',
  templateUrl: './all-group-nav.component.html',
  styleUrls: ['./all-group-nav.component.scss'],
  standalone: true,
  imports: [FormField, NgbDropdownModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllGroupNavComponent implements OnInit, AfterViewInit {
  dataManagementGroupService = inject(DataManagementGroupService);
  private translateService = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  currentLang: Language = DomainMessages.DEFAULT_LANG;

  public navFilterFormModel = signal<AllGroupNavFilterModel>({
    activeDateRange: true,
    formerDateRange: false,
    futureDateRange: false,
  });
  public navFilterForm = form(this.navFilterFormModel, () => {});

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;
    const f = this.dataManagementGroupService.currentFilter;
    this.navFilterFormModel.set({
      activeDateRange: f.activeDateRange ?? true,
      formerDateRange: f.formerDateRange ?? false,
      futureDateRange: f.futureDateRange ?? false,
    });
  }

  ngAfterViewInit(): void {
    this.translateService.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
        this.cdr.markForCheck();
      });
  }

  onClose() {
    const values = this.navFilterFormModel();
    const f = this.dataManagementGroupService.currentFilter;
    f.activeDateRange = values.activeDateRange;
    f.formerDateRange = values.formerDateRange;
    f.futureDateRange = values.futureDateRange;
    this.dataManagementGroupService.readPage(false);
  }
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  AfterViewInit,
  Component,
  EventEmitter,
  Injector,
  LOCALE_ID,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  effect,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { Language } from 'src/app/application/helpers/sharedItems';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { DateInputComponent } from 'src/app/presentation/shared/date-input/date-input.component';
import { RichTextEditorComponent } from 'src/app/presentation/shared/rich-text-editor/rich-text-editor.component';
import { transformNgbDateStructToDate, transformDateToNgbDateStruct } from 'src/app/shared/helpers/ngb-date.helper';
import { ExpandableCardComponent } from 'src/app/presentation/shared/expandable-card/expandable-card.component';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-edit-group-item',
  templateUrl: './edit-group-item.component.html',
  styleUrls: ['./edit-group-item.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    NgbDatepickerModule,
    TranslateModule,
    FontAwesomeModule,
    DateInputComponent,
    RichTextEditorComponent,
    ExpandableCardComponent
],
})
export class EditGroupItemComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  public dataManagementGroupService = inject(DataManagementGroupService);
  public authorizationService = inject(AuthorizationService);
  private locale: string = inject(LOCALE_ID);
  private translateService = inject(TranslateService);
  private injector = inject(Injector);

  @Output() isChangingEvent = new EventEmitter<boolean>();

  @ViewChild('groupForm', { static: false }) groupForm: NgForm | undefined;

  public currentLang: Language = DomainMessages.DEFAULT_LANG;
  public faCalendar = faCalendar;

  private ngUnsubscribe = new Subject<void>();
  private objectForUnsubscribe: Subscription | undefined;

  public validFromValid: boolean | undefined = undefined;
  public validUntilValid: boolean | undefined = undefined;
  public validFromTouched = false;
  public validUntilTouched = false;

  public internalValidFrom: NgbDateStruct | undefined;
  public internalValidUntil: NgbDateStruct | undefined;

  ngOnInit(): void {
    this.locale = DomainMessages.DEFAULT_LANG;
    this.readSignals();

    this.currentLang = this.translateService.currentLang as Language;
    this.dataManagementGroupService.init();
  }

  ngAfterViewInit(): void {
    this.objectForUnsubscribe = this.groupForm!.valueChanges!.subscribe(() => {
      if (this.groupForm!.dirty) {
        setTimeout(() => this.isChangingEvent.emit(true), 100);
      }
    });

    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
        setTimeout(() => {}, 200);
      });
  }

  ngOnDestroy(): void {
    if (this.objectForUnsubscribe) {
      this.objectForUnsubscribe.unsubscribe();
    }
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const isReset = this.dataManagementGroupService.isReset();
        if (isReset) {
          setTimeout(() => this.isChangingEvent.emit(false), 100);
        }
      });

      effect(() => {
        const group = this.dataManagementGroupService.editGroup;
        if (group) {
          this.internalValidFrom = group.validFrom ? transformDateToNgbDateStruct(group.validFrom) : undefined;
          this.internalValidUntil = group.validUntil ? transformDateToNgbDateStruct(group.validUntil) : undefined;
          this.calcValidation();
        }
      });
    });
  }

  public calcValidation(): void {
    const group = this.dataManagementGroupService.editGroup;
    if (!group) {
      return;
    }

    this.validFromValid = group.validFrom ? true : undefined;

    if (group.validUntil) {
      const validFrom = group.validFrom ? new Date(group.validFrom) : null;
      const validUntil = new Date(group.validUntil);

      if (!validFrom || !validUntil) {
        this.validUntilValid = false;
      } else {
        this.validUntilValid = validFrom < validUntil;
      }
    } else {
      this.validUntilValid = undefined;
    }
  }

  public onValidFromChange(): void {
    this.validFromTouched = true;
    const group = this.dataManagementGroupService.editGroup;
    if (group && this.internalValidFrom) {
      const date = transformNgbDateStructToDate(this.internalValidFrom);
      if (date) {
        group.validFrom = date;
      }
    }
    this.calcValidation();
  }

  public onValidUntilChange(): void {
    this.validUntilTouched = true;
    const group = this.dataManagementGroupService.editGroup;
    if (group) {
      group.validUntil = this.internalValidUntil ? transformNgbDateStructToDate(this.internalValidUntil) : undefined;
    }
    this.calcValidation();
  }

  public onDescriptionChange(content: string): void {
    if (this.dataManagementGroupService.editGroup) {
      this.dataManagementGroupService.editGroup.description = content;
      this.isChangingEvent.emit(true);
    }
  }
}

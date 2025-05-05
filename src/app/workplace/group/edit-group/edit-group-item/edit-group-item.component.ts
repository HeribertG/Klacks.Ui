import {
  AfterViewInit,
  Component,
  EventEmitter,
  Inject,
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
import { NgbDatepickerModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { DataManagementGroupService } from 'src/app/data/management/data-management-group.service';
import { Language } from 'src/app/helpers/sharedItems';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { ModalService, ModalType } from 'src/app/modal/modal.service';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AuthorizationService } from 'src/app/services/authorization.service';

@Component({
  selector: 'app-edit-group-item',
  templateUrl: './edit-group-item.component.html',
  styleUrls: ['./edit-group-item.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbDatepickerModule,
    TranslateModule,
    FontAwesomeModule,
  ],
})
export class EditGroupItemComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  public dataManagementGroupService = inject(DataManagementGroupService);
  public authorizationService = inject(AuthorizationService);
  private ngbModal = inject(NgbModal);
  private locale: string = inject(LOCALE_ID);
  private translateService = inject(TranslateService);
  private modalService = inject(ModalService);
  private injector = inject(Injector);

  @Output() isChangingEvent = new EventEmitter<boolean>();

  @ViewChild('groupForm', { static: false }) groupForm: NgForm | undefined;

  public currentLang: Language = MessageLibrary.DEFAULT_LANG;
  public faCalendar = faCalendar;

  private ngUnsubscribe = new Subject<void>();
  private objectForUnsubscribe: Subscription | undefined;

  ngOnInit(): void {
    this.locale = MessageLibrary.DEFAULT_LANG;
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
    });
  }
}

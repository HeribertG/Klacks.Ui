// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ModalService, ModalType } from '../modal.service';
import { Subject, takeUntil } from 'rxjs';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { FormsModule } from '@angular/forms';
import { DeletewindowComponent } from '../deletewindow/deletewindow.component';
import { MessageWindowComponent } from '../message-window/message-window.component';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    NgbModule,
    TranslateModule,
    DeletewindowComponent,
    MessageWindowComponent
],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent implements OnInit, AfterViewInit, OnDestroy {
  // @ViewChild properties
  @ViewChild('contentInput', { static: true })
  public contentInput!: ElementRef<HTMLElement>;
  @ViewChild('contentDelete', { static: true })
  private contentDelete!: ElementRef<HTMLElement>;
  @ViewChild('contentMessage', { static: true })
  private contentMessage!: ElementRef<HTMLElement>;

  // Public properties (used in templates)
  public modalService: ModalService;

  // Private properties
  private ngbModal: NgbModal;
  private ngUnsubscribe = new Subject<void>();

  constructor() {
    this.modalService = inject(ModalService);
    this.ngbModal = inject(NgbModal);
  }

  ngOnInit(): void {
    this.modalService.deleteMessageTitleDefault = 'delete';
    this.modalService.deleteMessageOkButtonDefault = '';
  }

  ngAfterViewInit(): void {
    this.modalService.openModelEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x: ModalType) => {
        switch (x) {
          case ModalType.Input: {
            this.open(this.contentInput, ModalType.Input);
            break;
          }
          case ModalType.Delete:
          case ModalType.Confirmation: {
            this.open(this.contentDelete, x);
            break;
          }
          case ModalType.Message: {
            this.open(this.contentMessage, ModalType.Message);
            break;
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  open(content: any, modalType: ModalType): void {
    this.modalService.contentInputString = '';
    this.ngbModal.open(content, { size: 'sm', centered: true }).result.then(
      () => {
        this.modalService.result(modalType);
      },
      () => {
        this.modalService.failedReason(modalType);
      }
    );
  }
}

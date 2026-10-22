// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Host component that opens ng-bootstrap modals (input, delete/confirmation, message) in response to ModalService events.
 * @param contentInput - Template ref for the text-input modal
 * @param contentDelete - Template ref for the delete/confirmation modal
 * @param contentMessage - Template ref for the message modal
 */
import {
  AfterViewInit, Component, DestroyRef, OnInit, TemplateRef, inject,
  ChangeDetectionStrategy,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ModalService } from '../modal.service';
import { ModalType } from '../modal-type.enum';
import { NgbModal, NgbModalOptions, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { DeletewindowComponent } from '../deletewindow/deletewindow.component';
import { MessageWindowComponent } from '../message-window/message-window.component';

const MODAL_OPEN_OPTIONS: NgbModalOptions = { centered: true };

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
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
export class ModalComponent implements OnInit, AfterViewInit {
  public readonly contentInput = viewChild.required<TemplateRef<unknown>>('contentInput');
  private readonly contentDelete = viewChild.required<TemplateRef<unknown>>('contentDelete');
  private readonly contentMessage = viewChild.required<TemplateRef<unknown>>('contentMessage');

  public modalService = inject(ModalService);
  private ngbModal = inject(NgbModal);
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.modalService.deleteMessageTitleDefault = 'delete';
    this.modalService.deleteMessageOkButtonDefault = '';
  }

  ngAfterViewInit(): void {
    this.modalService.openModelEvent
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((x: ModalType) => {
        switch (x) {
          case ModalType.Input: {
            this.open(this.contentInput(), ModalType.Input);
            break;
          }
          case ModalType.Delete:
          case ModalType.Confirmation: {
            this.open(this.contentDelete(), x);
            break;
          }
          case ModalType.Message: {
            this.open(this.contentMessage(), ModalType.Message);
            break;
          }
        }
      });
  }

  open(content: TemplateRef<unknown>, modalType: ModalType): void {
    this.modalService.contentInputString = '';
    this.ngbModal.open(content, MODAL_OPEN_OPTIONS).result.then(
      () => {
        this.modalService.result(modalType);
      },
      () => {
        this.modalService.failedReason(modalType);
      }
    );
  }
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Footer component displaying legal links (imprint, privacy policy),
 * a donation link opening a small donation dialog, and a link to the
 * external documentation.
 */
import { Component, ChangeDetectionStrategy, TemplateRef, inject, viewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  standalone: true,
  imports: [RouterModule, TranslateModule, NgbModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  private readonly ngbModal = inject(NgbModal);
  readonly donationModal = viewChild.required('donationModal', { read: TemplateRef });

  openDonation(): void {
    this.ngbModal.open(this.donationModal(), { size: 'md', centered: true });
  }
}

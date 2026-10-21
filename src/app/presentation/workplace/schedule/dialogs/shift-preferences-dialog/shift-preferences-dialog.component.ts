// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Dialog for managing client shift preferences (preferred, blacklist).
 * Displays two columns with assigned shifts and a dropdown to add new ones.
 * @param clientId - The client whose preferences are being managed
 * @param clientName - Display name shown in the dialog title
 */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  signal,
  TemplateRef,
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { form, FormField } from '@angular/forms/signals';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ClientShiftPreferenceService } from 'src/app/domain/services/shift/client-shift-preference.service';
import { IAvailableShift } from 'src/app/domain/models/shift/shift-preference';
import { IClientShiftPreference } from 'src/app/domain/models/shift/client-shift-preference.interface';
import { ShiftPreferenceType } from 'src/app/domain/models/shift/shift-preference-type.enum';

@Component({
  selector: 'app-shift-preferences-dialog',
  templateUrl: './shift-preferences-dialog.component.html',
  styleUrls: ['./shift-preferences-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, FormField, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShiftPreferencesDialogComponent {
  readonly modalTemplate = viewChild.required<TemplateRef<unknown>>('shiftPreferencesModal');

  private ngbModal = inject(NgbModal);
  private preferenceService = inject(ClientShiftPreferenceService);
  private cdr = inject(ChangeDetectorRef);

  clientId = '';
  clientName = '';

  private formModel = signal<{ selectedShiftId: string }>({ selectedShiftId: '' });
  protected prefForm = form(this.formModel);

  preferredShifts: IClientShiftPreference[] = [];
  blacklistShifts: IClientShiftPreference[] = [];
  availableShifts: IAvailableShift[] = [];

  ShiftPreferenceType = ShiftPreferenceType;

  private allShifts: IAvailableShift[] = [];
  private modalRef: NgbModalRef | null = null;

  open(clientId: string, clientName: string): void {
    this.clientId = clientId;
    this.clientName = clientName;
    this.formModel.set({ selectedShiftId: '' });

    this.preferenceService.load(clientId).subscribe(({ availableShifts, preferred, blacklist }) => {
      this.allShifts = availableShifts;
      this.preferredShifts = preferred;
      this.blacklistShifts = blacklist;
      this.updateAvailableShifts();
      this.cdr.markForCheck();
    });

    this.modalRef = this.ngbModal.open(this.modalTemplate(), {
      centered: true,
      backdrop: 'static',
      size: 'md',
    });
  }

  addToCategory(type: ShiftPreferenceType): void {
    const selectedShiftId = this.formModel().selectedShiftId;
    if (!selectedShiftId) return;

    const shift = this.allShifts.find((s) => s.id === selectedShiftId);
    if (!shift) return;

    const preference: IClientShiftPreference = {
      id: crypto.randomUUID(),
      clientId: this.clientId,
      shiftId: shift.id,
      preferenceType: type,
      shiftName: shift.name,
      shiftAbbreviation: shift.abbreviation,
    };

    switch (type) {
      case ShiftPreferenceType.Preferred:
        this.preferredShifts = [...this.preferredShifts, preference];
        break;
      case ShiftPreferenceType.Blacklist:
        this.blacklistShifts = [...this.blacklistShifts, preference];
        break;
    }

    this.formModel.set({ selectedShiftId: '' });
    this.updateAvailableShifts();
  }

  removeFromCategory(preference: IClientShiftPreference): void {
    this.preferredShifts = this.preferredShifts.filter(
      (p) => p.shiftId !== preference.shiftId,
    );
    this.blacklistShifts = this.blacklistShifts.filter(
      (p) => p.shiftId !== preference.shiftId,
    );
    this.updateAvailableShifts();
  }

  onSave(): void {
    this.preferenceService.save(this.clientId, this.preferredShifts, this.blacklistShifts).subscribe(() => {
      this.modalRef?.close();
    });
  }

  onCancel(): void {
    this.modalRef?.dismiss();
  }

  private updateAvailableShifts(): void {
    const assignedIds = new Set([
      ...this.preferredShifts.map((p) => p.shiftId),
      ...this.blacklistShifts.map((p) => p.shiftId),
    ]);
    this.availableShifts = this.allShifts.filter((s) => !assignedIds.has(s.id));
  }
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Dialog for managing client shift preferences (whitelist, preferred, blacklist).
 * Displays three columns with assigned shifts and a dropdown to add new ones.
 * @param clientId - The client whose preferences are being managed
 * @param clientName - Display name shown in the dialog title
 */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { DataShiftPreferenceService } from 'src/app/infrastructure/api/shift/data-shift-preference.service';
import {
  IAvailableShift,
  IClientShiftPreference,
  ShiftPreferenceType,
} from 'src/app/domain/models/shift/shift-preference';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-shift-preferences-dialog',
  templateUrl: './shift-preferences-dialog.component.html',
  styleUrls: ['./shift-preferences-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShiftPreferencesDialogComponent {
  @ViewChild('shiftPreferencesModal') modalTemplate!: TemplateRef<unknown>;

  private ngbModal = inject(NgbModal);
  private dataService = inject(DataShiftPreferenceService);
  private cdr = inject(ChangeDetectorRef);

  clientId = '';
  clientName = '';
  selectedShiftId = '';

  whitelistShifts: IClientShiftPreference[] = [];
  preferredShifts: IClientShiftPreference[] = [];
  blacklistShifts: IClientShiftPreference[] = [];
  availableShifts: IAvailableShift[] = [];

  ShiftPreferenceType = ShiftPreferenceType;

  private allShifts: IAvailableShift[] = [];
  private modalRef: NgbModalRef | null = null;

  open(clientId: string, clientName: string): void {
    this.clientId = clientId;
    this.clientName = clientName;
    this.selectedShiftId = '';

    forkJoin({
      preferences: this.dataService.getByClient(clientId),
      shifts: this.dataService.getAvailableShifts(clientId),
    }).subscribe(({ preferences, shifts }) => {
      this.allShifts = shifts;
      this.whitelistShifts = preferences.filter(
        (p) => p.preferenceType === ShiftPreferenceType.Whitelist,
      );
      this.preferredShifts = preferences.filter(
        (p) => p.preferenceType === ShiftPreferenceType.Preferred,
      );
      this.blacklistShifts = preferences.filter(
        (p) => p.preferenceType === ShiftPreferenceType.Blacklist,
      );
      this.updateAvailableShifts();
      this.cdr.markForCheck();
    });

    this.modalRef = this.ngbModal.open(this.modalTemplate, {
      centered: true,
      backdrop: 'static',
      size: 'lg',
    });
  }

  addToCategory(type: ShiftPreferenceType): void {
    if (!this.selectedShiftId) return;

    const shift = this.allShifts.find((s) => s.id === this.selectedShiftId);
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
      case ShiftPreferenceType.Whitelist:
        this.whitelistShifts = [...this.whitelistShifts, preference];
        break;
      case ShiftPreferenceType.Preferred:
        this.preferredShifts = [...this.preferredShifts, preference];
        break;
      case ShiftPreferenceType.Blacklist:
        this.blacklistShifts = [...this.blacklistShifts, preference];
        break;
    }

    this.selectedShiftId = '';
    this.updateAvailableShifts();
  }

  removeFromCategory(preference: IClientShiftPreference): void {
    this.whitelistShifts = this.whitelistShifts.filter(
      (p) => p.shiftId !== preference.shiftId,
    );
    this.preferredShifts = this.preferredShifts.filter(
      (p) => p.shiftId !== preference.shiftId,
    );
    this.blacklistShifts = this.blacklistShifts.filter(
      (p) => p.shiftId !== preference.shiftId,
    );
    this.updateAvailableShifts();
  }

  onSave(): void {
    const all = [
      ...this.whitelistShifts,
      ...this.preferredShifts,
      ...this.blacklistShifts,
    ];

    this.dataService.saveAll(this.clientId, all).subscribe(() => {
      this.modalRef?.close();
    });
  }

  onCancel(): void {
    this.modalRef?.dismiss();
  }

  private updateAvailableShifts(): void {
    const assignedIds = new Set([
      ...this.whitelistShifts.map((p) => p.shiftId),
      ...this.preferredShifts.map((p) => p.shiftId),
      ...this.blacklistShifts.map((p) => p.shiftId),
    ]);
    this.availableShifts = this.allShifts.filter(
      (s) => !assignedIds.has(s.id),
    );
  }
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, inject, computed, OnDestroy, OnInit, effect, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { form, FormField } from '@angular/forms/signals';
import { DataLoadFileService } from 'src/app/infrastructure/api/data-load-file.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-settings-general',
  templateUrl: './settings-general.component.html',
  styleUrls: ['./settings-general.component.scss'],
  standalone: true,
  imports: [TranslateModule, NgbModule, FormField],
})
export class SettingsGeneralComponent implements OnInit, OnDestroy {
  selectedFileIcon: File | undefined;
  selectedFileLogo: File | undefined;

  public dataLoadFileService = inject(DataLoadFileService);
  public translate = inject(TranslateService);
  private appSettingsService = inject(AppSettingsManagementService);
  private titleService = inject(Title);

  private destroy$ = new Subject<void>();
  private isInitialized = false;

  private generalModel = signal({ appName: '' });
  generalForm = form(this.generalModel);

  public logoImage = computed(() => this.dataLoadFileService.logoImage$());
  public logoDimensions = computed(() => this.dataLoadFileService.logoImageDimensions$());

  public logoDisplayDimensions = computed(() => {
    const dimensions = this.logoDimensions();
    if (!dimensions) {
      return { width: 64, height: 64 };
    }

    return this.dataLoadFileService.calculateProportionalDimensions(
      dimensions.width,
      dimensions.height,
      64,
      64,
      80
    );
  });

  constructor() {
    effect(() => {
      const model = this.generalModel();
      if (this.isInitialized) {
        this.appSettingsService.contactSettings.update(s => ({
          ...s,
          name: model.appName,
        }));
        this.updateBrowserTitle(model.appName);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.appSettingsService.loadSettingsAsync();
    const contact = this.appSettingsService.contactSettings();
    this.generalModel.set({ appName: contact.name });
    this.isInitialized = true;
  }

  private updateBrowserTitle(appName: string): void {
    if (appName && appName.trim() !== '') {
      this.titleService.setTitle(appName);
    }
  }

  onIconSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFileIcon = input.files[0];
      this.uploadIcon();
    }
  }

  private uploadIcon() {
    if (this.selectedFileIcon?.name) {
      const fd = new FormData();
      fd.append('file', this.selectedFileIcon, 'own-icon.ico');

      this.dataLoadFileService.upLoadFile(fd)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.tryLoadProfileImage();
          this.selectedFileIcon = undefined;
        });
    }
  }

  onUploadIcon(event: unknown) {
    this.selectedFileIcon = (event as File[])[0];
    this.uploadIcon();
  }

  onUploadIcon1(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFileIcon = input.files[0];
      this.uploadIcon();
    }
  }

  onLogoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFileLogo = input.files[0];
      this.uploadLogo();
    }
  }

  uploadLogo() {
    if (this.selectedFileLogo) {
      const fd = new FormData();
      fd.append('file', this.selectedFileLogo, 'own-logo.png');

      this.dataLoadFileService.upLoadFile(fd)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.tryLoadProfileImage();
          this.selectedFileLogo = undefined;
        });
    }
  }

  onUploadLogo(event: unknown) {
    this.selectedFileLogo = (event as File[])[0];
    this.uploadLogo();
  }

  onUploadLogo1(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFileLogo = input.files[0];
      this.uploadLogo();
    }
  }

  private tryLoadProfileImage() {
    this.dataLoadFileService.downLoadIcon();
    this.dataLoadFileService.downLoadLogo();
  }

  onClickDeleteIcon() {
    this.dataLoadFileService.deleteIcon();
    const favicon = document.getElementById('appIcon') as HTMLLinkElement;
    favicon.href = 'favicon.ico';
  }

  onClickDeleteLogo() {
    this.dataLoadFileService.deleteLogo();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

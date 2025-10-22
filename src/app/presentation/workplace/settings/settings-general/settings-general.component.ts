/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, inject, computed, OnDestroy } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { DataLoadFileService } from 'src/app/infrastructure/api/data-load-file.service';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';

import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-settings-general',
  templateUrl: './settings-general.component.html',
  styleUrls: ['./settings-general.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    NgbModule,
    SpinnerModule,
  ],
})
export class SettingsGeneralComponent implements OnDestroy {
  selectedFileIcon: File | undefined;
  selectedFileLogo: File | undefined;

  public dataLoadFileService = inject(DataLoadFileService);
  public translate = inject(TranslateService);
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  private titleService = inject(Title);

  private destroy$ = new Subject<void>();

  // Computed properties for logo dimensions and display
  public logoImage = computed(() => this.dataLoadFileService.logoImage$());
  public logoDimensions = computed(() => this.dataLoadFileService.logoImageDimensions$());
  
  // Calculated proportional dimensions for the logo (adjust size as needed for settings)
  public logoDisplayDimensions = computed(() => {
    const dimensions = this.logoDimensions();
    if (!dimensions) {
      return { width: 64, height: 64 }; // fallback for settings view
    }
    
    return this.dataLoadFileService.calculateProportionalDimensions(
      dimensions.width,
      dimensions.height,
      64, // max width for settings
      64, // max height for settings  
      80  // absolute max for settings
    );
  });

  onChange() {
    this.dataManagementSettingsService.settingsChangeTrigger.update(v => v + 1);
    this.updateBrowserTitle();
  }

  onKeyUp() {
    this.dataManagementSettingsService.settingsChangeTrigger.update(v => v + 1);
    this.updateBrowserTitle();
  }

  private updateBrowserTitle(): void {
    const appName = this.dataManagementSettingsService.appName;
    if (appName && appName.trim() !== '') {
      this.titleService.setTitle(appName);
    }
  }

  onIconSelected(event: any) {
    this.selectedFileIcon = event.target.files[0] as File;
    this.uploadIcon();
  }

  private uploadIcon() {
    if (this.selectedFileIcon!.name) {
      const fd = new FormData();

      fd.append('file', this.selectedFileIcon!, 'own-icon.ico');

      this.dataLoadFileService.upLoadFile(fd)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.tryLoadProfileImage();
          this.selectedFileIcon = undefined;
        });
    }
  }

  onUploadIcon(event: any) {
    this.selectedFileIcon = event[0] as File;
    this.uploadIcon();
  }
  onUploadIcon1(event: any) {
    this.selectedFileIcon = event.target.files[0] as File;
    this.uploadIcon();
  }

  onLogoSelected(event: any) {
    this.selectedFileLogo = event.target.files[0] as File;
    this.uploadLogo();
  }

  uploadLogo() {
    const fd = new FormData();
    fd.append('file', this.selectedFileLogo!, 'own-logo.png');

    this.dataLoadFileService.upLoadFile(fd)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.tryLoadProfileImage();
        this.selectedFileLogo = undefined;
      });
  }

  onUploadLogo(event: any) {
    this.selectedFileLogo = event[0] as File;
    this.uploadLogo();
  }

  onUploadLogo1(event: any) {
    this.selectedFileLogo = event.target.files[0] as File;
    this.uploadLogo();
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

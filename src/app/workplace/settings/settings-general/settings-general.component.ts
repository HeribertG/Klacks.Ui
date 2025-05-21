import { Component, EventEmitter, inject, Output } from '@angular/core';
import { DataLoadFileService } from 'src/app/data/data-load-file.service';
import { DataManagementSettingsService } from 'src/app/data/management/data-management-settings.service';

import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/spinner/spinner.module';
import { SharedModule } from 'src/app/shared/shared.module';

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
    SharedModule,
  ],
})
export class SettingsGeneralComponent {
  @Output() isChangingEvent = new EventEmitter<boolean>();

  selectedFileIcon: File | undefined;
  selectedFileLogo: File | undefined;

  public dataLoadFileService = inject(DataLoadFileService);
  public translate = inject(TranslateService);
  public dataManagementSettingsService = inject(DataManagementSettingsService);

  onChange() {
    this.isChangingEvent.emit(true);
  }

  onKeyUp() {
    this.isChangingEvent.emit(true);
  }

  onIconSelected(event: any) {
    this.selectedFileIcon = event.target.files[0] as File;
    this.uploadIcon();
  }

  private uploadIcon() {
    if (this.selectedFileIcon!.name) {
      const fd = new FormData();

      fd.append('file', this.selectedFileIcon!, 'own-icon.ico');

      this.dataLoadFileService.upLoadFile(fd).subscribe(() => {
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

    this.dataLoadFileService.upLoadFile(fd).subscribe((event) => {
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
    this.dataLoadFileService.iconImage = undefined;
    this.dataLoadFileService.deleteFile('own-icon.ico');
    const favicon = document.getElementById('appIcon') as HTMLLinkElement;
    favicon.href = 'favicon.ico';
  }

  onClickDeleteLogo() {
    this.dataLoadFileService.logoImage = undefined;
    this.dataLoadFileService.deleteFile('own-logo.png');
  }
}

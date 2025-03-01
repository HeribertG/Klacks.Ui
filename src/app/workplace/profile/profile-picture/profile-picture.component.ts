import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { DataLoadFileService } from 'src/app/data/data-load-file.service';
import { getFileExtension } from 'src/app/helpers/format-helper';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { LocalStorageService } from 'src/app/services/local-storage.service';

import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { SpinnerModule } from 'src/app/spinner/spinner.module';
import { RouterModule } from '@angular/router';
import { IconsModule } from 'src/app/icons/icons.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from 'src/app/shared/shared.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-profile-picture',
  templateUrl: './profile-picture.component.html',
  styleUrls: ['./profile-picture.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgbModule,
    IconsModule,
    SharedModule,
    SpinnerModule,
    TranslateModule,
    FontAwesomeModule,
  ],
})
export class ProfilePictureComponent implements OnInit {
  @Output() isChangingEvent = new EventEmitter();

  selectedFile: File | undefined = undefined;

  profileImage: any;

  constructor(
    public translate: TranslateService,
    public dataLoadFileService: DataLoadFileService,
    private localStorageService: LocalStorageService
  ) {}

  ngOnInit(): void {}

  onFileSelected(event: { target: { files: File[] } }): void {
    this.selectedFile = event.target.files[0] as File;

    this.upload();
  }

  private upload(): void {
    const id = this.localStorageService.get(MessageLibrary.TOKEN_USERID);

    if (id) {
      const ext = getFileExtension(this.selectedFile!.name);

      const filename =
        ext !== null && ext.length > 0 ? `${id}profile.` + ext : `${id}profile`;
      const fd = new FormData();
      fd.append('file', this.selectedFile!, filename);

      this.dataLoadFileService.upLoadFile(fd).subscribe((event) => {
        this.tryLoadProfileImage();
        this.selectedFile = undefined;
      });
    }
  }

  onDeleteImg(): void {
    const id = this.localStorageService.get(MessageLibrary.TOKEN_USERID);

    if (id) {
      const type = `${id}profile`;
      this.dataLoadFileService.deleteFile(type);
    }
  }

  onUpload(event: any): void {
    this.selectedFile = event[0] as File;

    this.upload();
  }
  onUpload1(event: any): void {
    this.selectedFile = event.target.files[0] as File;

    this.upload();
  }

  private tryLoadProfileImage(): void {
    const id = this.localStorageService.get(MessageLibrary.TOKEN_USERID);
    const imgId = `${id}profile`;
    this.dataLoadFileService.downLoadFile(imgId);
  }
}

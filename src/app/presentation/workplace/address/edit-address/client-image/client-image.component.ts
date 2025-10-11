/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  effect,
  EffectRef,
  EventEmitter,
  inject,
  Injector,
  OnDestroy,
  OnInit,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { DragDropFileUploadDirective } from 'src/app/presentation/directives/drag-drop-file-upload.directive';
import { DataLoadFileService } from 'src/app/infrastructure/api/data-load-file.service';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { ExpandableCardComponent } from 'src/app/presentation/shared/expandable-card/expandable-card.component';

@Component({
  selector: 'app-client-image',
  templateUrl: './client-image.component.html',
  styleUrls: ['./client-image.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    NgbModule,
    DragDropFileUploadDirective,
    ExpandableCardComponent,
  ],
})
export class ClientImageComponent implements OnInit, OnDestroy {
  @Output() isChangingEvent = new EventEmitter<boolean>();

  @ViewChild('imageForm', { static: false }) imageForm: NgForm | undefined;

  selectedFile: File | undefined;
  imageUrl = signal<string | undefined>(undefined);
  isLoading = signal(false);
  errorMessage = signal<string | undefined>(undefined);

  public dataLoadFileService = inject(DataLoadFileService);
  public translate = inject(TranslateService);
  public dataManagementClientService = inject(DataManagementClientService);
  private injector = inject(Injector);

  private effects: EffectRef[] = [];

  ngOnInit(): void {
    this.loadImage();

    const clientEffect = effect(() => {
      const client = this.dataManagementClientService.editClient();
      if (client) {
        this.loadImage();
      }
    }, { injector: this.injector });

    this.effects.push(clientEffect);
  }

  ngOnDestroy(): void {
    this.effects.forEach((effectRef) => {
      if (effectRef) {
        effectRef.destroy();
      }
    });
    this.effects = [];
  }

  loadImage() {
    const client = this.dataManagementClientService.editClient();
    if (!client || !client.clientImage) {
      this.imageUrl.set(undefined);
      return;
    }

    const imageData = client.clientImage.imageData;
    const contentType = client.clientImage.contentType;

    if (imageData && contentType) {
      try {
        const byteArray = this.base64ToBlob(imageData, contentType);
        const url = URL.createObjectURL(byteArray);
        this.imageUrl.set(url);
      } catch (error) {
        console.error('Error converting image:', error);
        this.imageUrl.set(undefined);
      }
    } else {
      this.imageUrl.set(undefined);
    }
  }

  private base64ToBlob(base64: string, contentType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0] as File;
    this.uploadImage();
  }

  onUploadImage(event: any) {
    this.selectedFile = event[0] as File;
    this.uploadImage();
  }

  onUploadImage1(event: any) {
    this.selectedFile = event.target.files[0] as File;
    this.uploadImage();
  }

  private async resizeImage(file: File): Promise<File> {
    const MAX_WIDTH = 1920;
    const MAX_HEIGHT = 1080;
    const MAX_FILE_SIZE = 1024 * 1024;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (
            width <= MAX_WIDTH &&
            height <= MAX_HEIGHT &&
            file.size <= MAX_FILE_SIZE
          ) {
            resolve(file);
            return;
          }

          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
            width = width * ratio;
            height = height * ratio;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          let quality = 0.9;
          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to create blob'));
                  return;
                }

                if (blob.size <= MAX_FILE_SIZE || quality <= 0.5) {
                  const resizedFile = new File([blob], file.name, {
                    type: file.type,
                    lastModified: Date.now(),
                  });
                  resolve(resizedFile);
                } else {
                  quality -= 0.1;
                  tryCompress();
                }
              },
              file.type,
              quality
            );
          };

          tryCompress();
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  private async uploadImage() {
    const client = this.dataManagementClientService.editClient();
    if (!client || !this.selectedFile) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(undefined);

    try {
      const resizedFile = await this.resizeImage(this.selectedFile);

      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];

        const clientImage: any = {
          clientId: client.id || '00000000-0000-0000-0000-000000000000',
          imageData: base64Data,
          contentType: resizedFile.type,
          fileName: resizedFile.name,
          fileSize: resizedFile.size,
        };

        if (client.clientImage?.id) {
          clientImage.id = client.clientImage.id;
        }

        this.dataManagementClientService.editClient.update((c) => {
          if (c) {
            c.clientImage = clientImage;
          }
          return c;
        });

        this.loadImage();
        this.selectedFile = undefined;
        this.isLoading.set(false);
        this.isChangingEvent.emit(true);
      };

      reader.onerror = () => {
        console.error('Error reading file');
        this.errorMessage.set('Error reading file');
        this.isLoading.set(false);
      };

      reader.readAsDataURL(resizedFile);
    } catch (error) {
      console.error('Error resizing image:', error);
      this.errorMessage.set('Error resizing image');
      this.isLoading.set(false);
    }
  }

  onClickDeleteImage() {
    this.dataManagementClientService.editClient.update((c) => {
      if (c) {
        c.clientImage = undefined;
      }
      return c;
    });

    this.imageUrl.set(undefined);
    this.isChangingEvent.emit(true);
  }
}

import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';

export interface ReportImage {
  id?: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

@Component({
  selector: 'app-image-upload',
  templateUrl: './image-upload.component.html',
  styleUrls: ['./image-upload.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule]
})
export class ImageUploadComponent {
  @Input() images: ReportImage[] = [];
  @Output() imagesChange = new EventEmitter<ReportImage[]>();
  @Output() imageSelect = new EventEmitter<ReportImage>();

  selectedImage: ReportImage | null = null;
  isDragging = false;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFiles(Array.from(input.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;

    if (event.dataTransfer?.files) {
      const files = Array.from(event.dataTransfer.files)
        .filter(f => f.type.startsWith('image/'));
      this.processFiles(files);
    }
  }

  private processFiles(files: File[]): void {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const newImage: ReportImage = {
            name: file.name,
            dataUrl: e.target?.result as string,
            width: Math.min(img.width, 200),
            height: Math.min(img.height, 100),
            x: 10,
            y: 10
          };
          this.images = [...this.images, newImage];
          this.imagesChange.emit(this.images);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  deleteImage(index: number): void {
    this.images = this.images.filter((_, i) => i !== index);
    this.imagesChange.emit(this.images);
    if (this.selectedImage && !this.images.includes(this.selectedImage)) {
      this.selectedImage = null;
    }
  }

  selectImage(image: ReportImage): void {
    this.selectedImage = image;
    this.imageSelect.emit(image);
  }

  updateImage(updated: ReportImage): void {
    const index = this.images.findIndex(img => img === this.selectedImage);
    if (index > -1) {
      this.images[index] = updated;
      this.images = [...this.images];
      this.selectedImage = updated;
      this.imagesChange.emit(this.images);
    }
  }
}

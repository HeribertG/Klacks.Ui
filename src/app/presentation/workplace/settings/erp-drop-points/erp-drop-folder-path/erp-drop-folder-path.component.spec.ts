// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Clipboard } from '@angular/cdk/clipboard';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ErpDropFolderPathComponent } from './erp-drop-folder-path.component';
import { IErpDropFolder } from 'src/app/domain/models/settings/erp-drop-folder.interface';
import { ERP_DROP_FOLDER_I18N } from 'src/app/domain/constants/erp-import-file.constants';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

const NATIVE_FOLDER: IErpDropFolder = {
  installation: 'native',
  folderPath: 'C:\\ProgramData\\Klacks\\ErpImport\\erp\\orders\\',
  containerPath: null,
  isHostPath: false,
};

const DOCKER_HOST_FOLDER: IErpDropFolder = {
  installation: 'docker',
  folderPath: '/opt/klacks/erp-import/erp/orders',
  containerPath: '/app/ErpImport/erp/orders/',
  isHostPath: true,
};

const DOCKER_CONTAINER_FOLDER: IErpDropFolder = {
  installation: 'docker',
  folderPath: '/app/ErpImport/erp/orders/',
  containerPath: '/app/ErpImport/erp/orders/',
  isHostPath: false,
};

describe('ErpDropFolderPathComponent', () => {
  let fixture: ComponentFixture<ErpDropFolderPathComponent>;
  let clipboard: { copy: ReturnType<typeof vi.fn> };
  let toast: { showSuccess: ReturnType<typeof vi.fn>; showError: ReturnType<typeof vi.fn> };

  const render = (folder: IErpDropFolder): HTMLElement => {
    fixture.componentRef.setInput('folder', folder);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    clipboard = { copy: vi.fn().mockReturnValue(true) };
    toast = { showSuccess: vi.fn(), showError: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ErpDropFolderPathComponent],
      providers: [
        { provide: Clipboard, useValue: clipboard },
        { provide: ToastShowService, useValue: toast },
        {
          provide: TranslateService,
          useValue: {
            instant: vi.fn((key: string) => `t:${key}`),
            get: vi.fn((key: string) => of(`t:${key}`)),
            stream: vi.fn((key: string) => of(`t:${key}`)),
            onLangChange: of({ lang: 'en' }),
            onTranslationChange: of({}),
            onDefaultLangChange: of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ErpDropFolderPathComponent);
  });

  it('shows the native folder read-only with the native hint and no container line', () => {
    const element = render(NATIVE_FOLDER);

    const input = element.querySelector('#erp-drop-points-folder-path') as HTMLInputElement;
    expect(input.value).toBe(NATIVE_FOLDER.folderPath);
    expect(input.readOnly).toBe(true);
    expect(element.querySelector('#erp-drop-points-folder-container-path')).toBeNull();
    expect(element.querySelector('#erp-drop-points-folder-hint')?.textContent).toContain(ERP_DROP_FOLDER_I18N.HINT_NATIVE);
  });

  it('shows the Docker host folder with the container path below and the host hint', () => {
    const element = render(DOCKER_HOST_FOLDER);

    expect((element.querySelector('#erp-drop-points-folder-path') as HTMLInputElement).value).toBe(DOCKER_HOST_FOLDER.folderPath);
    expect(element.querySelector('#erp-drop-points-folder-container-path')?.textContent).toContain('/app/ErpImport/erp/orders/');
    expect(element.querySelector('#erp-drop-points-folder-hint')?.textContent).toContain(ERP_DROP_FOLDER_I18N.HINT_DOCKER_HOST);
  });

  it('shows only the container path with the mount hint when Docker reports no host folder', () => {
    const element = render(DOCKER_CONTAINER_FOLDER);

    expect((element.querySelector('#erp-drop-points-folder-path') as HTMLInputElement).value).toBe(DOCKER_CONTAINER_FOLDER.folderPath);
    expect(element.querySelector('#erp-drop-points-folder-container-path')).toBeNull();
    expect(element.querySelector('#erp-drop-points-folder-hint')?.textContent).toContain(ERP_DROP_FOLDER_I18N.HINT_DOCKER_CONTAINER);
  });

  it('copies the shown path and confirms with a translated toast', () => {
    const element = render(DOCKER_HOST_FOLDER);

    (element.querySelector('#erp-drop-points-copy-path-btn') as HTMLButtonElement).click();

    expect(clipboard.copy).toHaveBeenCalledWith(DOCKER_HOST_FOLDER.folderPath);
    expect(toast.showSuccess).toHaveBeenCalledWith(`t:${ERP_DROP_FOLDER_I18N.COPIED}`, '');
    expect(toast.showError).not.toHaveBeenCalled();
  });

  it('shows a translated error toast when the clipboard refuses the copy', () => {
    clipboard.copy.mockReturnValue(false);
    const element = render(NATIVE_FOLDER);

    (element.querySelector('#erp-drop-points-copy-path-btn') as HTMLButtonElement).click();

    expect(toast.showError).toHaveBeenCalledWith(`t:${ERP_DROP_FOLDER_I18N.COPY_FAILED}`);
    expect(toast.showSuccess).not.toHaveBeenCalled();
  });

  it('labels the icon-only copy button for screen readers', () => {
    const element = render(NATIVE_FOLDER);

    const button = element.querySelector('#erp-drop-points-copy-path-btn') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe(`t:${ERP_DROP_FOLDER_I18N.COPY}`);
  });
});

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { AssetDownloadService } from './asset-download.service';

describe('AssetDownloadService', () => {
  let service: AssetDownloadService;
  let mockHttp: any;
  let createdLinks: HTMLAnchorElement[];

  const assetPath = 'assets/docs/sample/sample.xml';
  const fileName = 'sample.xml';
  const mimeType = 'application/xml';
  const fileContent = '<sample />';
  const objectUrl = 'blob:mock-url';

  beforeEach(() => {
    mockHttp = { get: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AssetDownloadService,
        { provide: HttpClient, useValue: mockHttp },
      ],
    });

    service = TestBed.inject(AssetDownloadService);

    createdLinks = [];
    window.URL.createObjectURL = vi.fn().mockReturnValue(objectUrl);
    window.URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      createdLinks.push(this);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('fetches the asset as text and triggers a browser download', async () => {
    mockHttp.get.mockReturnValue(of(fileContent));

    await new Promise<void>(resolve => {
      service.downloadAsset(assetPath, fileName, mimeType).subscribe(() => resolve());
    });

    expect(mockHttp.get).toHaveBeenCalledWith(assetPath, { responseType: 'text' });
    expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);

    const blob = (window.URL.createObjectURL as any).mock.calls[0][0] as Blob;
    expect(blob.type).toBe(mimeType);
    expect(blob.size).toBe(fileContent.length);

    expect(createdLinks.length).toBe(1);
    expect(createdLinks[0].download).toBe(fileName);
    expect(createdLinks[0].href).toContain(objectUrl);
  });

  it('revokes the object URL after the download was triggered', async () => {
    mockHttp.get.mockReturnValue(of(fileContent));

    await new Promise<void>(resolve => {
      service.downloadAsset(assetPath, fileName, mimeType).subscribe(() => resolve());
    });

    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith(objectUrl);
  });

  it('does not trigger a download before subscription', () => {
    mockHttp.get.mockReturnValue(of(fileContent));

    service.downloadAsset(assetPath, fileName, mimeType);

    expect(window.URL.createObjectURL).not.toHaveBeenCalled();
    expect(createdLinks.length).toBe(0);
  });
});

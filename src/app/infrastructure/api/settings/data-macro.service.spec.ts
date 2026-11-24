// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { HttpStatusCode } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { DataMacroService } from './data-macro.service';
import { IMacro } from 'src/app/domain/models/settings/macro.interface';
import { Macro } from 'src/app/domain/models/settings/macro-class';
import { MacroCategoryEnum } from 'src/app/domain/enums/macro-category.enum';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { environment } from 'src/environments/environment';

describe('DataMacroService', () => {
  let service: DataMacroService;
  let httpMock: HttpTestingController;

  const macrosUrl = `${environment.baseUrl}Macros/Macros/`;
  const rejection = { status: HttpStatusCode.BadRequest, statusText: 'Bad Request' };

  const buildMacro = (): IMacro =>
    Object.assign(new Macro(), {
      id: 'macro-1',
      name: 'Accident',
      content: 'OUTPUT 1, Hour',
      category: MacroCategoryEnum.Unspecified,
      isDirty: CreateEntriesEnum.rewrite,
    });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataMacroService],
    });
    service = TestBed.inject(DataMacroService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sends a rejected update exactly once', () => {
    // Arrange
    let failed = false;

    // Act
    service.updateMacro(buildMacro()).subscribe({ error: () => (failed = true) });
    httpMock.expectOne({ method: 'PUT', url: macrosUrl }).flush('invalid script', rejection);

    // Assert
    expect(failed).toBe(true);
  });

  it('sends a rejected create exactly once', () => {
    // Arrange
    let failed = false;

    // Act
    service.addMacro(buildMacro()).subscribe({ error: () => (failed = true) });
    httpMock.expectOne({ method: 'POST', url: macrosUrl }).flush('invalid script', rejection);

    // Assert
    expect(failed).toBe(true);
  });

  it('sends a rejected delete exactly once', () => {
    // Arrange
    let failed = false;

    // Act
    service.deleteMacro('macro-1').subscribe({ error: () => (failed = true) });
    httpMock.expectOne({ method: 'DELETE', url: `${macrosUrl}macro-1` }).flush('not found', rejection);

    // Assert
    expect(failed).toBe(true);
  });

  it('still repeats a failed read of the macro list', () => {
    // Arrange
    const readUrl = `${environment.baseUrl}Macros/Macros`;
    let loaded: IMacro[] | undefined;

    // Act
    service.readMacroList().subscribe((macros) => (loaded = macros));
    httpMock.expectOne(readUrl).flush('unavailable', { status: HttpStatusCode.ServiceUnavailable, statusText: 'Unavailable' });
    httpMock.expectOne(readUrl).flush([buildMacro()]);

    // Assert
    expect(loaded?.length).toBe(1);
  });
});

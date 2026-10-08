/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { provideSeamlessAuth, seamlessAuthInterceptor } from '../src';
import { createAdapter, signedOut } from './adapter';

describe('seamlessAuthInterceptor', () => {
  it('sends cookies to the adapter origin and nowhere else', () => {
    TestBed.configureTestingModule({
      providers: [
        provideSeamlessAuth({
          apiHost: 'https://app.example.com',
          fetch: createAdapter({ 'GET /users/me': signedOut }).fetch,
        }),
        provideHttpClient(withInterceptors([seamlessAuthInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const http = TestBed.inject(HttpClient);
    const backend = TestBed.inject(HttpTestingController);

    http.get('https://app.example.com/api/orders').subscribe();
    http.get('https://app.example.com.evil.test/api/orders').subscribe();
    http.get('https://other.example.com/api').subscribe();
    http.get('not a url at all ::').subscribe();

    expect(
      backend.expectOne('https://app.example.com/api/orders').request.withCredentials
    ).toBe(true);
    expect(
      backend.expectOne('https://app.example.com.evil.test/api/orders').request
        .withCredentials
    ).toBe(false);
    expect(
      backend.expectOne('https://other.example.com/api').request.withCredentials
    ).toBe(false);
    backend.expectOne('not a url at all ::');
    backend.verify();
  });
});

import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { User } from '../models/user.model';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const user: User = {
    id: 1,
    username: 'listener',
    email: 'listener@example.com',
    avatarUrl: '/avatar.png'
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate']) }
      ]
    });
  });

  afterEach(() => localStorage.clear());

  it('requires both a stored user and a token for authentication', () => {
    localStorage.setItem('currentUser', JSON.stringify(user));
    const service = TestBed.inject(AuthService);

    expect(service.isAuthenticated()).toBeFalse();

    localStorage.setItem('jwt_token', 'test-token');
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('clears a malformed stored session instead of failing construction', () => {
    localStorage.setItem('currentUser', '{invalid-json');
    localStorage.setItem('jwt_token', 'test-token');

    const service = TestBed.inject(AuthService);

    expect(service.currentUserValue).toBeNull();
    expect(localStorage.getItem('currentUser')).toBeNull();
    expect(localStorage.getItem('jwt_token')).toBeNull();
  });

  it('stores the session returned for a Google credential', () => {
    const service = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);

    service.loginWithGoogle('google-id-token').subscribe();

    const request = http.expectOne('/api/v1/auth/google');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ credential: 'google-id-token' });
    request.flush({ token: 'jwt-token', user });

    expect(service.currentUserValue).toEqual(user);
    expect(service.getToken()).toBe('jwt-token');
    http.verify();
  });
});

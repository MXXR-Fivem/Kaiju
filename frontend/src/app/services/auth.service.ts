import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { Registration, Session } from '../models/kaiju.models';
import { API_URL } from './kaiju-api.service';

const STORAGE_KEY = 'kaiju_session';

function restoreSession(): Session | null {
  try {
    const session: Session | null = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    return session && session.user.exp * 1000 > Date.now() ? session : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly session = signal<Session | null>(restoreSession());
  readonly user = computed(() => this.session()?.user ?? null);

  login(username: string, password: string): Observable<Session> {
    return this.http
      .post<Session>(`${API_URL}/auth/login`, { username, password })
      .pipe(tap((session) => this.store(session)));
  }

  register(registration: Registration): Observable<Session> {
    return this.http
      .post<Session>(`${API_URL}/auth/register`, registration)
      .pipe(tap((session) => this.store(session)));
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.session.set(null);
    this.router.navigate(['/login']);
  }

  private store(session: Session): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    this.session.set(session);
  }
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const token = auth.session()?.token;
  const authorized = token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
  return next(authorized).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && token) {
        auth.logout();
      }
      return throwError(() => error);
    })
  );
};

export const authGuard: CanActivateFn = () =>
  inject(AuthService).user() ? true : inject(Router).createUrlTree(['/login']);

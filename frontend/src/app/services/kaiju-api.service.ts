import { Injectable, inject, isDevMode } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Disaster,
  DisasterType,
  District,
  NewReservation,
  NewTransfer,
  Reservation,
  Stock,
  Transfer
} from '../models/kaiju.models';

export const API_URL = isDevMode() ? 'http://localhost:8080/api' : '/api';

export function describeError(error: HttpErrorResponse): string {
  const body = error.error;
  return body?.error_code ? `[${body.error_code}] ${body.message}` : `Erreur réseau (${error.status}).`;
}

@Injectable({ providedIn: 'root' })
export class KaijuApiService {
  private http = inject(HttpClient);

  getDistricts(): Observable<District[]> {
    return this.http.get<District[]>(`${API_URL}/districts`);
  }

  getDisasters(): Observable<Disaster[]> {
    return this.http.get<Disaster[]>(`${API_URL}/disasters`);
  }

  getStocks(): Observable<Stock[]> {
    return this.http.get<Stock[]>(`${API_URL}/stocks`);
  }

  getTransfers(): Observable<Transfer[]> {
    return this.http.get<Transfer[]>(`${API_URL}/transfers`);
  }

  getReservations(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${API_URL}/reservations`);
  }

  createTransfer(transfer: NewTransfer): Observable<Transfer> {
    return this.http.post<Transfer>(`${API_URL}/transfers`, transfer);
  }

  reviewTransfer(id: string, approved: boolean): Observable<Transfer> {
    return this.http.post<Transfer>(`${API_URL}/transfers/${id}/review`, { approved });
  }

  deliverTransfer(id: string): Observable<Transfer> {
    return this.http.post<Transfer>(`${API_URL}/transfers/${id}/deliver`, {});
  }

  reserve(reservation: NewReservation): Observable<Reservation> {
    return this.http.post<Reservation>(`${API_URL}/reservations`, reservation);
  }

  returnReservation(id: string): Observable<Reservation> {
    return this.http.post<Reservation>(`${API_URL}/reservations/${id}/return`, {});
  }

  lowerRetention(): Observable<void> {
    return this.http.post<void>(`${API_URL}/retention/lower`, {});
  }

  verifyGodMode(password: string): Observable<void> {
    return this.http.post<void>(`${API_URL}/god-mode/verify`, { password });
  }

  triggerDisaster(password: string, district: string, disasterType: DisasterType, level: number): Observable<Disaster> {
    return this.http.post<Disaster>(`${API_URL}/god-mode/disasters`, {
      password,
      district,
      disaster_type: disasterType,
      level
    });
  }

  resolveDisaster(password: string, district: string): Observable<void> {
    return this.http.post<void>(`${API_URL}/god-mode/resolve`, { password, district });
  }

  resetCity(password: string): Observable<void> {
    return this.http.post<void>(`${API_URL}/god-mode/reset`, { password });
  }
}

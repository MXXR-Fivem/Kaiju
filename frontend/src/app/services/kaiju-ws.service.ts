import { Injectable, signal, isDevMode } from '@angular/core';
import { Subject } from 'rxjs';
import { TacticalAlert, WsMessage } from '../models/kaiju.models';

@Injectable({
  providedIn: 'root'
})
export class KaijuWsService {
  private socket: WebSocket | null = null;
  private reconnectTimeout: any = null;
  private isDestroyed = false;

  readonly isConnected = signal<boolean>(false);
  readonly alerts = signal<TacticalAlert[]>([]);
  readonly latestDisaster = signal<any>(null);

  readonly messages$ = new Subject<WsMessage>();
  readonly resourceUpdates$ = new Subject<any>();
  readonly resourceConflicts$ = new Subject<any>();
  readonly disasterChanges$ = new Subject<any>();
  readonly transferUpdates$ = new Subject<any>();

  constructor() {
    this.connect();
  }

  connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsUrl = this.resolveWsUrl();
    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnected.set(true);
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingMessage(data);
        } catch (e) {}
      };

      this.socket.onclose = () => {
        this.isConnected.set(false);
        if (!this.isDestroyed) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = () => {
        this.socket?.close();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private resolveWsUrl(): string {
    if (isDevMode()) {
      return 'ws://localhost:8080/ws';
    }
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}/ws`;
    }
    return 'ws://localhost:8080/ws';
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 3000);
  }

  private handleIncomingMessage(msg: WsMessage): void {
    this.messages$.next(msg);

    switch (msg.type) {
      case 'RESOURCE_UPDATED':
        this.resourceUpdates$.next(msg.payload);
        break;

      case 'RESOURCE_CONFLICT':
        this.resourceConflicts$.next(msg.payload);
        this.addAlert({
          id: `conflict_${Date.now()}`,
          severity: 'CRITICAL',
          title: `CONFLIT DE RESSOURCE [${msg.payload.district_code}]`,
          message: msg.payload.message,
          timestamp: new Date()
        });
        break;

      case 'DISASTER_TRIGGERED':
        this.latestDisaster.set(msg.payload);
        this.disasterChanges$.next(msg.payload);
        break;

      case 'DISASTER_RESOLVED':
        this.latestDisaster.set(null);
        this.disasterChanges$.next(msg.payload);
        break;

      case 'TRANSFER_STATUS_CHANGED':
        this.transferUpdates$.next(msg.payload);
        break;

      case 'ALERT':
        this.addAlert({
          id: `alert_${Date.now()}`,
          severity: msg.payload.severity || 'WARNING',
          title: msg.payload.title,
          message: msg.payload.message,
          timestamp: new Date()
        });
        break;
    }
  }

  addAlert(alert: TacticalAlert): void {
    this.alerts.update((current) => [alert, ...current.slice(0, 19)]);
  }

  dismissAlert(id: string): void {
    this.alerts.update((current) => current.filter((a) => a.id !== id));
  }

  send(message: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(message);
    }
  }
}

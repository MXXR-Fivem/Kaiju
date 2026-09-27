import { Injectable, isDevMode, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { TacticalAlert, WsMessage } from '../models/kaiju.models';

const WS_URL = isDevMode()
  ? 'ws://localhost:8080/ws'
  : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;

let alertSequence = 0;

function toAlert(message: WsMessage): TacticalAlert | null {
  const payload = message.payload;
  const base = { id: String(++alertSequence), timestamp: new Date() };
  switch (message.type) {
    case 'RESOURCE_CONFLICT':
      return {
        ...base,
        severity: 'CRITICAL',
        title: `Conflit de ressource [${payload.district}]`,
        message: `${payload.message} Équipes : ${payload.contenders.join(', ')}.`
      };
    case 'LEVEL_CHANGED': {
      const escalation = payload.level > payload.previous_level;
      return {
        ...base,
        severity: escalation ? (payload.level >= 4 ? 'CRITICAL' : 'WARNING') : 'INFO',
        title: `${escalation ? 'Escalade' : 'Désescalade'} ${payload.district} : niveau ${payload.previous_level} → ${payload.level}`,
        message: `Niveau de la ville : ${payload.city_level}.`
      };
    }
    case 'RETENTION_CHANGED':
      return {
        ...base,
        severity: 'WARNING',
        title: `Seuil de rétention : ${payload.retention_pct} %`,
        message: 'Les quantités transférables ont été recalculées.'
      };
    default:
      return null;
  }
}

@Injectable({ providedIn: 'root' })
export class KaijuWsService {
  readonly isConnected = signal(false);
  readonly alerts = signal<TacticalAlert[]>([]);
  readonly events$ = new Subject<WsMessage>();

  private socket: WebSocket | null = null;
  private token: string | null = null;
  private retry?: ReturnType<typeof setTimeout>;

  connect(token: string): void {
    this.token = token;
    this.open();
  }

  disconnect(): void {
    this.token = null;
    clearTimeout(this.retry);
    this.socket?.close();
    this.alerts.set([]);
  }

  dismissAlert(id: string): void {
    this.alerts.update((alerts) => alerts.filter((alert) => alert.id !== id));
  }

  private open(): void {
    if (!this.token || this.socket) return;
    const socket = new WebSocket(`${WS_URL}?token=${encodeURIComponent(this.token)}`);
    socket.onopen = () => this.isConnected.set(true);
    socket.onmessage = (event) => this.handle(JSON.parse(event.data));
    socket.onclose = () => {
      this.isConnected.set(false);
      this.socket = null;
      this.retry = setTimeout(() => this.open(), 3000);
    };
    this.socket = socket;
  }

  private handle(message: WsMessage): void {
    this.events$.next(message);
    const alert = toAlert(message);
    if (alert) {
      this.alerts.update((alerts) => [alert, ...alerts].slice(0, 30));
    }
  }
}

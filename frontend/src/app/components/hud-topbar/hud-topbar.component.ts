import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CrisisContextService } from '../../services/crisis-context.service';
import { HudWindowService } from '../../services/hud-window.service';
import { KaijuWsService } from '../../services/kaiju-ws.service';
import { LEVEL_COLORS, LEVEL_LABELS } from '../../models/kaiju.models';

@Component({
  selector: 'app-hud-topbar',
  standalone: true,
  template: `
    <header class="fixed top-0 left-0 right-0 h-12 bg-black/95 border-b border-zinc-800 z-50 px-3 flex items-center justify-between text-xs font-mono select-none">
      <div class="flex items-center gap-3">
        <span class="font-bold tracking-widest text-white uppercase text-sm">KAIJU</span>
        <span data-testid="city-level" class="px-2 py-0.5 border text-[10px] font-bold uppercase tracking-wider"
              [style.border-color]="levelColor()" [style.color]="levelColor()">
          Niveau {{ context.cityLevel() }} — {{ levelLabel() }}
        </span>
        <span class="text-[10px] text-zinc-400 tracking-widest hidden lg:block">{{ clock }}</span>
        <span class="text-[10px]" [class.text-green-500]="ws.isConnected()" [class.text-red-500]="!ws.isConnected()">
          [{{ ws.isConnected() ? 'LIVE' : 'HORS LIGNE' }}]
        </span>
      </div>

      <nav class="flex items-center gap-1.5">
        <button class="hud-tab" [class.hud-tab-active]="!context.sidebarCollapsed()" (click)="context.toggleSidebar()">
          Stocks (BO)
        </button>
        @for (item of windows; track item.id) {
          <button class="hud-tab" [class.hud-tab-active]="hud.windows()[item.id].isOpen" (click)="hud.toggle(item.id)">
            {{ item.label }}
            @if (item.id === 'alerts' && ws.alerts().length > 0) {
              <span class="ml-1 text-amber-400">{{ ws.alerts().length }}</span>
            }
          </button>
        }
        <button class="hud-tab" (click)="hud.resetLayout()">Reset HUD</button>
      </nav>

      <div class="flex items-center gap-2">
        @if (auth.user(); as user) {
          <span data-testid="current-user" class="text-green-400 text-[11px]">
            [{{ user.role }}{{ user.district ? ' · ' + user.district : '' }}] {{ user.username }}
          </span>
        }
        <button class="hud-btn-danger" (click)="auth.logout()">Déconnexion</button>
      </div>
    </header>
  `
})
export class HudTopbarComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  context = inject(CrisisContextService);
  hud = inject(HudWindowService);
  ws = inject(KaijuWsService);

  readonly windows = [
    { id: 'dashboard', label: 'Tableau de bord' },
    { id: 'transfers', label: 'Transferts' },
    { id: 'reservations', label: 'Réservations' },
    { id: 'calendar', label: 'Calendrier' },
    { id: 'alerts', label: 'Alertes' }
  ];

  clock = '';
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.tick();
    this.timer = setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  levelColor(): string {
    return LEVEL_COLORS[this.context.cityLevel()];
  }

  levelLabel(): string {
    return LEVEL_LABELS[this.context.cityLevel()];
  }

  private tick(): void {
    this.clock = new Date().toLocaleTimeString('fr-FR');
  }
}

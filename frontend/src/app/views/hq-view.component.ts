import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { MapComponent } from '../components/map/map.component';
import { HudTopbarComponent } from '../components/hud-topbar/hud-topbar.component';
import { HudWindowComponent } from '../components/hud-window/hud-window.component';
import { AlertsPanelComponent } from '../components/panels/alerts-panel.component';
import { DashboardPanelComponent } from '../components/panels/dashboard-panel.component';
import { TransfersPanelComponent } from '../components/panels/transfers-panel.component';
import { ReservationsPanelComponent } from '../components/panels/reservations-panel.component';
import { CalendarPanelComponent } from '../components/panels/calendar-panel.component';
import { BoSidebarComponent } from '../components/bo-sidebar/bo-sidebar.component';
import { AuthService } from '../services/auth.service';
import { CrisisContextService } from '../services/crisis-context.service';
import { KaijuWsService } from '../services/kaiju-ws.service';

@Component({
  selector: 'app-hq-view',
  standalone: true,
  imports: [
    NgClass,
    NgIf,
    MapComponent,
    HudTopbarComponent,
    HudWindowComponent,
    AlertsPanelComponent,
    DashboardPanelComponent,
    TransfersPanelComponent,
    ReservationsPanelComponent,
    CalendarPanelComponent,
    BoSidebarComponent
  ],
  template: `
    <div class="relative w-screen h-[100dvh] overflow-hidden bg-black font-mono select-none">
      <app-hud-topbar></app-hud-topbar>

      <div class="fixed inset-0 z-0 pt-[var(--topbar-h)] flex">
        <aside class="relative h-full shrink-0 overflow-hidden bg-black transition-[width,min-width] duration-300 ease-out"
               [ngClass]="context.sidebarCollapsed() ? 'w-0 min-w-0 border-r-0' : 'w-full sm:w-2/5 min-w-0 sm:min-w-[360px] border-r border-zinc-800'"
               [attr.aria-hidden]="context.sidebarCollapsed()"
               [attr.inert]="context.sidebarCollapsed() ? '' : null">
          <app-bo-sidebar class="block h-full w-full"></app-bo-sidebar>
        </aside>

        <main class="relative flex-1 min-w-0 h-full">
          <app-map class="block w-full h-full"></app-map>

          <button *ngIf="context.sidebarCollapsed()"
                  type="button"
                  (click)="context.toggleSidebar()"
                  title="Deplier le panneau BO des stocks"
                  class="absolute left-0 top-1/2 -translate-y-1/2 z-[45] px-1 py-3 bg-black/95 border border-l-0 border-zinc-700 hover:border-green-500 text-zinc-400 hover:text-green-400 text-[10px] font-bold tracking-widest transition-colors [writing-mode:vertical-rl]">
            [BO] STOCKS &gt;&gt;
          </button>
        </main>
      </div>

      <app-hud-window windowId="dashboard"><app-dashboard-panel></app-dashboard-panel></app-hud-window>
      <app-hud-window windowId="alerts"><app-alerts-panel></app-alerts-panel></app-hud-window>
      <app-hud-window windowId="transfers"><app-transfers-panel></app-transfers-panel></app-hud-window>
      <app-hud-window windowId="reservations"><app-reservations-panel></app-reservations-panel></app-hud-window>
      <app-hud-window windowId="calendar"><app-calendar-panel></app-calendar-panel></app-hud-window>
    </div>
  `
})
export class HqViewComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  context = inject(CrisisContextService);
  private ws = inject(KaijuWsService);

  ngOnInit(): void {
    const session = this.auth.session();
    if (session) {
      this.ws.connect(session.token);
      this.context.loadAll();
      this.context.selectedDistrictCode.set(session.user.district);
    }
  }

  ngOnDestroy(): void {
    this.ws.disconnect();
  }
}

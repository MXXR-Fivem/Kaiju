import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from '../components/map/map.component';
import { HudTopbarComponent } from '../components/hud-topbar/hud-topbar.component';
import { HudWindowComponent } from '../components/hud-window/hud-window.component';
import { AlertsPanelComponent } from '../components/panels/alerts-panel.component';
import { InventoryPanelComponent } from '../components/panels/inventory-panel.component';
import { TransfersPanelComponent } from '../components/panels/transfers-panel.component';
import { ReservationsPanelComponent } from '../components/panels/reservations-panel.component';
import { CalendarPanelComponent } from '../components/panels/calendar-panel.component';
import { CrisisContextService } from '../services/crisis-context.service';

@Component({
  selector: 'app-hq-view',
  standalone: true,
  imports: [
    CommonModule,
    MapComponent,
    HudTopbarComponent,
    HudWindowComponent,
    AlertsPanelComponent,
    InventoryPanelComponent,
    TransfersPanelComponent,
    ReservationsPanelComponent,
    CalendarPanelComponent
  ],
  template: `
    <div class="relative w-screen h-screen overflow-hidden bg-black font-mono select-none">
      <app-hud-topbar></app-hud-topbar>

      <main class="fixed inset-0 w-full h-full z-0 pt-10">
        <app-map></app-map>
      </main>

      <app-hud-window windowId="alerts">
        <app-alerts-panel></app-alerts-panel>
      </app-hud-window>

      <app-hud-window windowId="inventory">
        <app-inventory-panel></app-inventory-panel>
      </app-hud-window>

      <app-hud-window windowId="transfers">
        <app-transfers-panel></app-transfers-panel>
      </app-hud-window>

      <app-hud-window windowId="reservations">
        <app-reservations-panel></app-reservations-panel>
      </app-hud-window>

      <app-hud-window windowId="calendar">
        <app-calendar-panel></app-calendar-panel>
      </app-hud-window>
    </div>
  `
})
export class HqViewComponent {
  context = inject(CrisisContextService);
}

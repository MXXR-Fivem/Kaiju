import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from '../components/map/map.component';
import { NavbarLeftComponent } from '../components/navbar-left/navbar-left.component';
import { NavbarRightComponent } from '../components/navbar-right/navbar-right.component';
import { TransferModalComponent } from '../components/modals/transfer-modal.component';
import { ReservationModalComponent } from '../components/modals/reservation-modal.component';
import { InventoryModalComponent } from '../components/modals/inventory-modal.component';
import { CalendarModalComponent } from '../components/modals/calendar-modal.component';
import { CrisisContextService } from '../services/crisis-context.service';

@Component({
  selector: 'app-hq-view',
  standalone: true,
  imports: [
    CommonModule,
    MapComponent,
    NavbarLeftComponent,
    NavbarRightComponent,
    TransferModalComponent,
    ReservationModalComponent,
    InventoryModalComponent,
    CalendarModalComponent
  ],
  template: `
    <div class="relative w-screen h-screen flex overflow-hidden select-none"
         [ngClass]="context.crisisThemeClass()">
      <app-navbar-left></app-navbar-left>

      <main class="flex-1 h-full relative overflow-hidden">
        <app-map></app-map>
      </main>

      <app-navbar-right></app-navbar-right>

      <app-transfer-modal></app-transfer-modal>
      <app-reservation-modal></app-reservation-modal>
      <app-inventory-modal></app-inventory-modal>
      <app-calendar-modal></app-calendar-modal>
    </div>
  `
})
export class HqViewComponent {
  context = inject(CrisisContextService);
}

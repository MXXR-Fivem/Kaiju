import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KaijuApiService } from '../../services/kaiju-api.service';
import { CrisisContextService } from '../../services/crisis-context.service';
import { District, ResourceType } from '../../models/kaiju.models';

@Component({
  selector: 'app-reservation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="context.isReserveModalOpen()" 
         class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div class="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden font-mono text-xs text-slate-200">
        <div class="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-amber-400 font-bold">[RES]</span>
            <h3 class="font-bold text-sm text-white">Reservation Locale Intra-Quartier</h3>
          </div>
          <button (click)="context.isReserveModalOpen.set(false)" class="text-slate-400 hover:text-white text-base">X</button>
        </div>

        <form (ngSubmit)="submitReservation()" class="p-5 space-y-4">
          <div *ngIf="errorMessage" class="p-3 rounded bg-red-950/80 border border-red-600 text-red-200 space-y-1">
            <div class="font-bold flex items-center gap-1.5">
              <span>[CONFLIT]</span>
              <span>Refus ou Conflit de Ressource [{{ errorCode }}]</span>
            </div>
            <p class="text-[11px] leading-relaxed">{{ errorMessage }}</p>
          </div>

          <div>
            <label class="block text-slate-400 mb-1">Quartier d'intervention :</label>
            <select [(ngModel)]="districtCode" name="district"
                    class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sky-300 focus:outline-none focus:border-sky-500">
              <option *ngFor="let d of districts" [value]="d.code">
                {{ d.name }} ({{ d.code }}) - Niveau {{ d.current_disaster_level }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-slate-400 mb-1">Nom de l'Unite / Equipe Tactique :</label>
            <input type="text" [(ngModel)]="teamName" name="team" required placeholder="Ex: Alpha-Rescue-1"
                   class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-sky-500" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-400 mb-1">Ressource :</label>
              <select [(ngModel)]="selectedResource" name="resource"
                      class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-sky-500">
                <option *ngFor="let r of resourceTypes" [value]="r.code">{{ r.name }}</option>
              </select>
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Quantite :</label>
              <input type="number" [(ngModel)]="quantity" name="qty" min="1" required
                     class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-amber-300 font-bold focus:outline-none focus:border-sky-500" />
            </div>
          </div>

          <div class="p-2.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-400">
            Note : Reservations intra-quartier permises des le Niveau 2. Les conflits de contention sont notifies en direct par WebSocket.
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button type="button" (click)="context.isReserveModalOpen.set(false)"
                    class="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">
              Annuler
            </button>
            <button type="submit" [disabled]="isSubmitting"
                    class="px-5 py-2 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold shadow-lg transition">
              {{ isSubmitting ? 'Reservation...' : 'Bloquer la Ressource' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class ReservationModalComponent implements OnInit {
  api = inject(KaijuApiService);
  context = inject(CrisisContextService);

  districts: District[] = [];
  resourceTypes: ResourceType[] = [];

  districtCode = 'X';
  teamName = 'Secours-Nexus-1';
  selectedResource = 'MED_KIT';
  quantity = 50;

  errorMessage: string | null = null;
  errorCode: string | null = null;
  isSubmitting = false;

  ngOnInit(): void {
    this.api.getDistricts().subscribe((d) => this.districts = d);
    this.api.getResourceTypes().subscribe((r) => this.resourceTypes = r);
  }

  submitReservation(): void {
    this.errorMessage = null;
    this.errorCode = null;
    this.isSubmitting = true;

    this.api.reserveResource({
      district_id_or_code: this.districtCode,
      resource_code: this.selectedResource,
      user_id: this.context.currentUser().id,
      team_name: this.teamName,
      quantity: this.quantity
    }).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        alert(res.message);
        this.context.isReserveModalOpen.set(false);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorCode = err.error?.error_code || 'HTTP_' + err.status;
        this.errorMessage = err.error?.message || 'Erreur lors de la reservation.';
      }
    });
  }
}

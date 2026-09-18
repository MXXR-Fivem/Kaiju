import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KaijuApiService } from '../../services/kaiju-api.service';
import { CrisisContextService } from '../../services/crisis-context.service';
import { District, ResourceType } from '../../models/kaiju.models';

@Component({
  selector: 'app-reservations-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col font-mono text-xs select-none space-y-3">
      <div class="flex items-center justify-between pb-2 border-b border-zinc-800">
        <span class="text-zinc-400 text-[10px] uppercase tracking-wider">
          ALLOCATION DIRECTE D'URGENCE (INTRA-QUARTIER)
        </span>
        <span class="text-green-500 text-[10px] uppercase font-bold">
          [MODE OPERATIONNEL]
        </span>
      </div>

      <form (ngSubmit)="submitReservation()" class="space-y-3">
        <div *ngIf="errorMessage" class="p-2.5 bg-red-950/60 border border-red-600 text-red-200 text-xs space-y-1">
          <div class="font-bold">[CONFLIT RESSOURCE : {{ errorCode }}]</div>
          <p class="text-[11px] leading-relaxed">{{ errorMessage }}</p>
        </div>

        <div *ngIf="successMessage" class="p-2.5 bg-green-950/60 border border-green-600 text-green-200 text-xs">
          {{ successMessage }}
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-zinc-400 text-[10px] uppercase mb-1">QUARTIER :</label>
            <select [(ngModel)]="districtCode" name="district"
                    class="w-full bg-black border border-zinc-700 text-white p-1.5 text-xs focus:outline-none focus:border-green-500">
              <option *ngFor="let d of districts" [value]="d.code">
                [{{ d.code }}] {{ d.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-zinc-400 text-[10px] uppercase mb-1">BRIGADE / EQUIPE :</label>
            <input type="text" [(ngModel)]="teamName" name="team" required placeholder="Ex: BRAVO-RESCUE-1"
                   class="w-full bg-black border border-zinc-700 text-white p-1.5 text-xs focus:outline-none focus:border-green-500" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-zinc-400 text-[10px] uppercase mb-1">RESSOURCE :</label>
            <select [(ngModel)]="selectedResource" name="resource"
                    class="w-full bg-black border border-zinc-700 text-white p-1.5 text-xs focus:outline-none focus:border-green-500">
              <option *ngFor="let r of resourceTypes" [value]="r.code">
                {{ r.name }} ({{ r.unit }})
              </option>
            </select>
          </div>

          <div>
            <label class="block text-zinc-400 text-[10px] uppercase mb-1">QUANTITE :</label>
            <input type="number" [(ngModel)]="quantity" name="qty" min="1" required
                   class="w-full bg-black border border-zinc-700 text-white p-1.5 text-xs focus:outline-none focus:border-green-500" />
          </div>
        </div>

        <button type="submit" [disabled]="isSubmitting"
                class="w-full py-2 border border-green-500 text-green-400 hover:bg-green-500 hover:text-black font-bold uppercase tracking-wider text-xs transition-colors">
          {{ isSubmitting ? 'VERIFICATION ET VERROUILLAGE...' : 'RESERVER RESSOURCE POUR LA BRIGADE' }}
        </button>
      </form>
    </div>
  `
})
export class ReservationsPanelComponent implements OnInit {
  context = inject(CrisisContextService);
  private api = inject(KaijuApiService);

  districts: District[] = [];
  resourceTypes: ResourceType[] = [];

  districtCode = 'X';
  teamName = 'SQUAD-ECHO-1';
  selectedResource = 'WATER';
  quantity = 50;

  isSubmitting = false;
  errorMessage = '';
  errorCode = '';
  successMessage = '';

  ngOnInit(): void {
    this.api.getDistricts().subscribe((d) => {
      this.districts = d;
      if (this.context.selectedDistrictCode()) {
        this.districtCode = this.context.selectedDistrictCode()!;
      }
    });

    this.api.getResourceTypes().subscribe((r) => {
      this.resourceTypes = r;
    });
  }

  submitReservation(): void {
    this.isSubmitting = true;
    this.errorMessage = '';
    this.errorCode = '';
    this.successMessage = '';

    const payload = {
      district_id_or_code: this.districtCode,
      resource_code: this.selectedResource,
      user_id: this.context.currentUser().id,
      team_name: this.teamName,
      quantity: this.quantity
    };

    this.api.reserveResource(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.successMessage = `RESERVATION VALIDEE : ${this.quantity} ${this.selectedResource} BLOQUES POUR ${this.teamName} [REF: ${res.reservation_id}]`;
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorCode = err.error?.error_code || 'CONFLIT';
        this.errorMessage = err.error?.message || 'Erreur lors de la reservation.';
      }
    });
  }
}

import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { describeError } from '../services/kaiju-api.service';
import { DISTRICT_CODES, ROLE_LABELS, Role } from '../models/kaiju.models';

@Component({
  selector: 'app-login-view',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen bg-black text-zinc-200 font-mono flex items-center justify-center p-4">
      <div class="w-full max-w-sm border border-zinc-800 border-t-2 border-t-green-500 p-5 space-y-4">
        <div>
          <h1 class="text-green-400 font-bold tracking-widest uppercase">KAIJU — Tokyork</h1>
          <p class="text-[10px] text-zinc-500 uppercase">Plateforme de coordination des secours</p>
        </div>

        <div class="grid grid-cols-2 gap-1">
          <button type="button" class="hud-tab" [class.hud-tab-active]="mode === 'login'" (click)="mode = 'login'">
            Connexion
          </button>
          <button type="button" class="hud-tab" [class.hud-tab-active]="mode === 'register'" (click)="mode = 'register'">
            Inscription
          </button>
        </div>

        <form (ngSubmit)="submit()" class="space-y-3">
          @if (error) {
            <div class="hud-error" role="alert">{{ error }}</div>
          }
          <label class="hud-label">
            <span>Identifiant</span>
            <input class="hud-input" name="username" [(ngModel)]="username" required autocomplete="username" />
          </label>
          <label class="hud-label">
            <span>Mot de passe</span>
            <input class="hud-input" name="password" type="password" [(ngModel)]="password" required />
          </label>

          @if (mode === 'register') {
            <label class="hud-label">
              <span>Rôle</span>
              <select class="hud-input" name="role" [(ngModel)]="role">
                @for (entry of roles; track entry[0]) {
                  <option [value]="entry[0]">{{ entry[0] }} — {{ entry[1] }}</option>
                }
              </select>
            </label>
            @if (role === 'QC') {
              <label class="hud-label">
                <span>Quartier</span>
                <select class="hud-input" name="district" [(ngModel)]="district">
                  @for (code of districtCodes; track code) {
                    <option [value]="code">{{ code }}</option>
                  }
                </select>
              </label>
            }
          }

          <button type="submit" class="hud-btn w-full py-2" [disabled]="loading">
            {{ mode === 'login' ? 'Se connecter' : 'Créer le compte' }}
          </button>
        </form>
      </div>
    </div>
  `
})
export class LoginViewComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly roles = Object.entries(ROLE_LABELS);
  readonly districtCodes = DISTRICT_CODES;

  mode: 'login' | 'register' = 'login';
  username = '';
  password = '';
  role: Role = 'QC';
  district = 'A';
  loading = false;
  error = '';

  submit(): void {
    this.loading = true;
    this.error = '';
    const request =
      this.mode === 'login'
        ? this.auth.login(this.username, this.password)
        : this.auth.register({
            username: this.username,
            password: this.password,
            role: this.role,
            district: this.role === 'QC' ? this.district : null
          });
    request.subscribe({
      next: () => this.router.navigate(['/']),
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.error = describeError(err);
      }
    });
  }
}

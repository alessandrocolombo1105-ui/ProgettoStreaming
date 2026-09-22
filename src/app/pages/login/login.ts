import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthError, AuthSession } from '../../core/models';
import { AuthService, DEMO_ACCOUNTS, DemoAccount } from '../../core/services/auth.service';
import { GoogleAuthService, GoogleProfile } from '../../core/services/google-auth.service';
import { Icon } from '../../shared/components/icon/icon';

/** Modalità del riquadro: accesso a un account esistente o registrazione. */
type Mode = 'signin' | 'signup';

/**
 * Accesso e registrazione.
 *
 * L'accesso con Google usa il pulsante ufficiale di Google Identity Services
 * quando è configurato un Client ID. In sua assenza resta disponibile un
 * selettore di account fittizi, dichiarato come simulazione: non imita la
 * schermata di Google e non chiede mai credenziali reali.
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly google = inject(GoogleAuthService);
  private readonly router = inject(Router);

  /** Contenitore in cui Google disegna il proprio pulsante. */
  private readonly googleSlot = viewChild<ElementRef<HTMLElement>>('googleSlot');

  /** Indirizzo a cui tornare dopo l'accesso, fornito dalla guardia. */
  readonly returnUrl = input('/');

  protected readonly mode = signal<Mode>('signin');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /** Vero quando c'è un Client ID: determina quale dei due percorsi mostrare. */
  protected readonly googleReady = this.google.isConfigured;
  protected readonly demoAccounts = DEMO_ACCOUNTS;
  protected readonly showDemoPicker = signal(false);

  protected readonly form = new FormGroup({
    displayName: new FormControl('', { nonNullable: true }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
  });

  protected readonly isSignUp = computed(() => this.mode() === 'signup');
  protected readonly title = computed(() => (this.isSignUp() ? 'Crea il tuo account' : 'Bentornato'));
  protected readonly submitLabel = computed(() => (this.isSignUp() ? 'Registrati' : 'Accedi'));

  constructor() {
    // Il pulsante di Google va disegnato dall'SDK dentro un contenitore reale,
    // quindi solo dopo che il template lo ha reso disponibile.
    effect(() => {
      const slot = this.googleSlot()?.nativeElement;
      if (!slot || !this.googleReady) {
        return;
      }

      this.google
        .renderButton(
          slot,
          (profile) => this.onGoogleProfile(profile),
          (message) => this.errorMessage.set(message),
        )
        .catch((error: Error) => this.errorMessage.set(error.message));
    });
  }

  protected toggleMode(): void {
    this.mode.update((current) => (current === 'signin' ? 'signup' : 'signin'));
    this.errorMessage.set(null);
    this.form.controls.password.reset('');
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const { email, password, displayName } = this.form.getRawValue();
    this.run(
      this.isSignUp()
        ? this.auth.signUp({ email, password, displayName })
        : this.auth.signIn({ email, password }),
    );
  }

  /* ----------------------------------------------------------------------
     Google
     ---------------------------------------------------------------------- */

  private onGoogleProfile(profile: GoogleProfile): void {
    this.run(this.auth.signInWithGoogleProfile(profile));
  }

  protected toggleDemoPicker(): void {
    this.showDemoPicker.update((open) => !open);
    this.errorMessage.set(null);
  }

  protected chooseDemoAccount(account: DemoAccount): void {
    if (!this.submitting()) {
      this.showDemoPicker.set(false);
      this.run(this.auth.signInWithDemoAccount(account));
    }
  }

  protected initialsOf(account: DemoAccount): string {
    return account.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  /* ----------------------------------------------------------------------
     Interni
     ---------------------------------------------------------------------- */

  /** Esegue la richiesta gestendo caricamento, errore e navigazione finale. */
  private run(request$: Observable<AuthSession>): void {
    this.submitting.set(true);
    this.errorMessage.set(null);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigateByUrl(this.returnUrl() || '/');
      },
      error: (error: AuthError) => {
        this.submitting.set(false);
        this.errorMessage.set(error?.message ?? 'Accesso non riuscito. Riprova.');
      },
    });
  }

  /** Vero quando il campo è stato toccato ed è in errore: evita avvisi precoci. */
  protected showError(control: 'email' | 'password'): boolean {
    const field = this.form.controls[control];
    return field.invalid && (field.touched || field.dirty);
  }
}

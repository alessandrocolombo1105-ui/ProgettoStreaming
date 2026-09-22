import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthError } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { Icon } from '../../shared/components/icon/icon';

/** Modalità del riquadro: accesso a un account esistente o registrazione. */
type Mode = 'signin' | 'signup';

/**
 * Accesso e registrazione.
 *
 * Dopo il login si torna all'indirizzo da cui è scattata la guardia
 * (`returnUrl`), così l'utente riprende dalla pagina che stava cercando di
 * aprire invece di ritrovarsi in home.
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
  private readonly router = inject(Router);

  /** Indirizzo a cui tornare dopo l'accesso, fornito dalla guardia. */
  readonly returnUrl = input('/');

  protected readonly mode = signal<Mode>('signin');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

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
  protected readonly title = computed(() => (this.isSignUp() ? 'Crea il tuo account' : 'Accedi'));
  protected readonly submitLabel = computed(() =>
    this.isSignUp() ? 'Registrati' : 'Accedi',
  );

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
    const request$ = this.isSignUp()
      ? this.auth.signUp({ email, password, displayName })
      : this.auth.signIn({ email, password });

    this.run(request$);
  }

  protected signInWithGoogle(): void {
    if (!this.submitting()) {
      this.run(this.auth.signInWithGoogle());
    }
  }

  /** Esegue la richiesta gestendo caricamento, errore e navigazione finale. */
  private run(request$: ReturnType<AuthService['signIn']>): void {
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

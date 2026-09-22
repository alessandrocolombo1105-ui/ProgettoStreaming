import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TmdbService } from './core/services/tmdb.service';
import { DetailModal } from './shared/components/detail-modal/detail-modal';
import { Header } from './shared/components/header/header';
import { Icon } from './shared/components/icon/icon';

/**
 * Guscio dell'applicazione: navbar, pagina corrente e l'unica istanza della
 * modale dettagli, condivisa da caroselli, banner e catalogo.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, DetailModal, Icon],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly tmdb = inject(TmdbService);

  /** Senza chiave TMDB nessuna richiesta va a buon fine: va detto subito. */
  protected readonly isConfigured = this.tmdb.isConfigured;

  protected readonly year = new Date().getFullYear();
}

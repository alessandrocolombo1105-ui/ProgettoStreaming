import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

/**
 * Ogni pagina è caricata su richiesta con `loadComponent`: il bundle iniziale
 * resta limitato alla home, e catalogo, lista e login arrivano solo quando
 * l'utente li apre davvero.
 *
 * I parametri di query (`?query=`, `?returnUrl=`) raggiungono gli input dei
 * componenti grazie a `withComponentInputBinding()`, configurato in
 * `app.config.ts`.
 */
export const routes: Routes = [
  {
    path: '',
    title: 'Xflix — Film e Serie TV in streaming',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'film',
    title: 'Film — Xflix',
    loadComponent: () => import('./pages/movies/movies').then((m) => m.Movies),
  },
  {
    path: 'serie-tv',
    title: 'Serie TV — Xflix',
    loadComponent: () => import('./pages/tv-shows/tv-shows').then((m) => m.TvShows),
  },
  {
    path: 'catalogo',
    title: 'Catalogo — Xflix',
    loadComponent: () => import('./pages/catalog/catalog').then((m) => m.Catalog),
  },
  {
    path: 'la-mia-lista',
    title: 'La Mia Lista — Xflix',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/my-list/my-list').then((m) => m.MyList),
  },
  {
    path: 'login',
    title: 'Accedi — Xflix',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  // Qualsiasi indirizzo sconosciuto riporta alla home.
  { path: '**', redirectTo: '' },
];

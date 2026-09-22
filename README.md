# Xflix

Piattaforma di streaming di film e serie TV in stile Netflix, costruita con Angular 22
(standalone components, Signals, RxJS) e alimentata da **TMDB API v3**.

## Avvio rapido

1. Ottieni una chiave API su [TMDB](https://www.themoviedb.org/settings/api) → *API Key (v3 auth)*.
2. Inseriscila in [`src/environments/environment.ts`](src/environments/environment.ts):

   ```ts
   apiKey: 'la-tua-chiave',
   ```

   Finché resta il segnaposto, l'app mostra un avviso in fondo alla pagina e i
   caroselli restano vuoti: ogni richiesta a TMDB risponderebbe `401`.

3. Installa ed esegui:

   ```bash
   npm install
   npm start
   ```

   L'app è su `http://localhost:4200`.

## Comandi

| Comando         | Descrizione                                  |
| --------------- | -------------------------------------------- |
| `npm start`     | Server di sviluppo con ricaricamento a caldo |
| `npm run build` | Build di produzione in `dist/`               |
| `npm test`      | Suite di test (Vitest)                       |

## Struttura

```
src/app/
├─ core/
│  ├─ models/        Interfacce TMDB, utente, filtri del catalogo
│  ├─ services/      TmdbService, AuthService, MyListService, GenreStore, DetailModalService
│  ├─ interceptors/  Chiave API, lingua e normalizzazione degli errori
│  ├─ guards/        authGuard (rotte protette) e guestGuard
│  └─ utils/         Helper su film/serie e stato asincrono
├─ shared/components/
│  ├─ header/        Navbar con ricerca live (debounce 300 ms)
│  ├─ hero-banner/   Titolo in evidenza a piena larghezza
│  ├─ movie-row/     Carosello orizzontale con frecce
│  ├─ movie-card/    Scheda con pannello dettagli in hover
│  ├─ detail-modal/  Scheda completa e player YouTube
│  └─ icon/          Icone SVG inline
└─ pages/            home, film, serie-tv, catalogo, la-mia-lista, login
```

## Funzionalità

- **Catalogo TMDB** — trending, popolari, più votati, in arrivo e per genere, per film e serie.
- **Ricerca live** — `FormControl` con `debounceTime(300)`, `distinctUntilChanged()` e `switchMap`,
  con risultati rapidi nella navbar e ricerca completa nel catalogo.
- **Filtri combinabili** — tipo, genere, anno, voto minimo e ordinamento, con caricamento a pagine.
- **La Mia Lista** — stato reattivo su Signals, separato per utente e conservato tra le sessioni.
- **Modale dettagli** — `<dialog>` nativo (focus trap ed Esc gratuiti), cast, generi, titoli simili
  e trailer YouTube con URL sanificato tramite `DomSanitizer`.
- **Autenticazione** — email/password e Google, con rotte protette da `canActivate`.

### Autenticazione: stato attuale

`AuthService` è un **mock su `localStorage`**: nessun dato lascia il browser e le password
sono conservate in chiaro. Va bene per lo sviluppo, non per la produzione.

La superficie pubblica del servizio (Observable in ingresso, Signal in uscita) è pensata per
restare invariata passando a Supabase o Firebase: cambia il corpo dei metodi, non i componenti
che li usano.

## Note

Questo prodotto usa le API di TMDB ma non è approvato né certificato da TMDB.

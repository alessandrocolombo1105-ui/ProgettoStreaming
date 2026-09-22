# Lumen

Piattaforma di streaming di film e serie TV costruita con Angular 22
(standalone components, Signals, RxJS), alimentata da **TMDB API v3**.

Tema **Aurora Glass**: vetro smerigliato e gradienti aurora su blu notte.

## Avvio rapido

```bash
npm install
npm start
```

L'app è su `http://localhost:4200`.

## Configurazione

Tutto sta in [`src/environments/environment.ts`](src/environments/environment.ts).

### TMDB (obbligatorio)

Chiave gratuita da [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) →
*API Key (v3 auth)*. Senza, l'app parte ma i caroselli restano vuoti e compare un
avviso in fondo alla pagina: ogni richiesta risponderebbe `401`.

### Google Sign-In (facoltativo, gratuito)

Finché `google.clientId` resta il segnaposto, l'accesso "con Google" usa un
**selettore di account simulato**, dichiarato come tale nell'interfaccia: nessun
account reale è coinvolto e non vengono mai chieste credenziali Google.

Per abilitare il login Google vero, in 5 minuti:

1. [console.cloud.google.com](https://console.cloud.google.com/) → crea un progetto
2. *API e servizi* → *Schermata consenso OAuth* → tipo **Esterno**, compila nome app ed email
3. *Credenziali* → *Crea credenziali* → *ID client OAuth* → tipo **Applicazione web**
4. In *Origini JavaScript autorizzate* aggiungi `http://localhost:4200`
5. Copia l'ID (finisce con `.apps.googleusercontent.com`) in `google.clientId`

Il pulsante ufficiale di Google sostituisce automaticamente il selettore simulato.

> **Limite noto:** senza un backend la firma dell'ID token non viene verificata.
> Va bene per demo e portfolio; in produzione il token va inviato a un server che
> ne controlli la firma contro le chiavi pubbliche di Google.

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
│  ├─ services/      TmdbService, AuthService, GoogleAuthService,
│  │                 MyListService, GenreStore, DetailModalService
│  ├─ interceptors/  Chiave API, lingua e normalizzazione degli errori
│  ├─ guards/        authGuard (rotte protette) e guestGuard
│  └─ utils/         Helper su film/serie e stato asincrono
├─ shared/components/
│  ├─ header/        Navbar flottante a pillola con ricerca live (debounce 300 ms)
│  ├─ hero-banner/   Titolo in evidenza con pannello di vetro
│  ├─ movie-row/     Carosello orizzontale con frecce nella testata
│  ├─ movie-card/    Scheda con pannello dettagli e bordo luminoso
│  ├─ detail-modal/  Scheda completa e player YouTube
│  └─ icon/          Icone SVG inline
└─ pages/            home, film, serie-tv, catalogo, la-mia-lista, login
```

## Design system

I token vivono in [`src/styles.css`](src/styles.css) sotto il prefisso `--lx-`.

| Ruolo            | Token                        | Valore              |
| ---------------- | ---------------------------- | ------------------- |
| Sfondo           | `--lx-bg`                    | `#0B1020`           |
| Superficie       | `--lx-surface`               | `#121A2E`           |
| Accento primario | `--lx-violet`                | `#7C5CFF`           |
| Accento seconda. | `--lx-cyan`                  | `#22D3EE`           |
| Gradiente        | `--lx-accent-grad`           | violetto → ciano    |
| Vetro            | `--lx-glass` + `.lx-glass`   | bianco 5,5% + blur  |

L'aurora di fondo è disegnata una sola volta su `body::before`, in posizione
fissa: resta dietro al contenuto mentre la pagina scorre.

## Funzionalità

- **Catalogo TMDB** — trending, popolari, più votati, in arrivo e per genere, film e serie.
- **Ricerca live** — `FormControl` con `debounceTime(300)`, `distinctUntilChanged()` e
  `switchMap`, con risultati rapidi nella navbar e ricerca completa nel catalogo.
- **Filtri combinabili** — tipo, genere, anno, voto minimo e ordinamento, con paginazione.
- **Lista personale** — stato reattivo su Signals, separata per utente e conservata fra sessioni.
- **Modale dettagli** — `<dialog>` nativo (focus trap ed Esc gratuiti), cast, generi,
  titoli simili e trailer YouTube con URL sanificato tramite `DomSanitizer`.
- **Autenticazione** — email/password, Google Sign-In, rotte protette da `canActivate`.

### Autenticazione: stato attuale

`AuthService` conserva gli account su `localStorage`, con le password in chiaro.
Va bene per lo sviluppo, non per la produzione.

La superficie pubblica (Observable in ingresso, Signal in uscita) è pensata per
restare invariata passando a Supabase o Firebase: cambia il corpo dei metodi, non
i componenti che li usano.

## Note

Questo prodotto usa le API di TMDB ma non è approvato né certificato da TMDB.

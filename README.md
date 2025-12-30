# VITA – più tempo per te

VITA è un'applicazione web pensata per aiutarti a gestire la tua giornata in modo semplice e concentrato. Nasce prima di tutto come strumento personale per ridurre l'attrito nella gestione quotidiana delle attività e delle abitudini. Solo in un secondo momento potrà evolvere in una piattaforma modulare con funzioni premium.

## Caratteristiche principali dell'MVP

- **Dashboard ordinata** con riepilogo dei task e delle abitudini del giorno.
- **Gestione Task**: crea, visualizza, aggiorna e completa i tuoi task quotidiani.
- **Gestione Abitudini**: registra le abitudini che vuoi coltivare, imposta un target giornaliero e traccia i progressi.
- **Progressi in tempo reale**: vedi quanti task ti restano e la percentuale di avanzamento della giornata. Ogni abitudine mostra una progress bar.
- **Predisposizione ai moduli**: sono presenti nel modello dati tabelle per moduli a pagamento e feature flag, ma non sono attive nell'MVP.

## Struttura del repository

La repository segue una struttura monorepo semplificata:

```
vita/
├── apps/
│   └── web/          # Next.js app (frontend + API routes)
│       ├── app/      # App Router con pagine e API
│       ├── lib/      # Moduli condivisi (db, auth)
│       ├── package.json
│       ├── next.config.js
│       └── .env.example
├── infra/
│   ├── docker-compose.yml    # Avvia il DB PostgreSQL in locale
│   └── init.sql              # Script SQL per inizializzare le tabelle
├── packages/
│   └── shared/               # (vuoto, pronto per future librerie condivise)
├── .github/
│   ├── workflows/ci.yml      # GitHub Actions per lint/build
│   └── db_init.sql           # Schema minimo per i test CI
└── README.md
```

## Prerequisiti

- [Node.js](https://nodejs.org/) >= 18
- [Docker](https://www.docker.com/) (consigliato per avviare il database in locale)

## Configurazione locale

1. **Clona la repository** (se hai scaricato l'archivio, estrai i file).

   ```bash
   git clone <URL-repo-clonata> vita
   cd vita
   ```

2. **Avvia PostgreSQL con Docker**.

   ```bash
   cd infra
   docker compose up -d
   ```

   Questo comando avvierà un container PostgreSQL accessibile sulla porta `5432` con un database chiamato `vita_db` e user/password `postgres`. Lo script `init.sql` verrà eseguito automaticamente e creerà tutte le tabelle necessarie.

3. **Configura le variabili d'ambiente**.

   Copia il file `.env.example` in `.env` nella cartella `apps/web` e modifica i valori secondo la tua configurazione locale. Per esempio:

   ```bash
   cd ../apps/web
   cp .env.example .env
   # modifica DATABASE_URL e JWT_SECRET a piacimento
   ```

   La stringa `DATABASE_URL` deve puntare al database avviato al punto 2:

   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vita_db
   JWT_SECRET=unsegretoverystrong
   ```

4. **Installa le dipendenze**.

   ```bash
   cd ../apps/web
   npm install
   ```

5. **Avvia l'applicazione in sviluppo**.

   ```bash
   npm run dev
   ```

   L'applicazione sarà disponibile all'indirizzo `http://localhost:3000`. Puoi accedere, registrarti, aggiungere task e abitudini.

## Deploy su Vercel

VITA è progettata per essere facilmente deployata su [Vercel](https://vercel.com/). Le API sono integrate nei route handlers di Next.js, quindi non è necessario un server separato. Segui questi passaggi:

1. **Configura un database gestito** (es. [Neon](https://neon.tech/), [Supabase](https://supabase.com/), [Render](https://render.com/)). Crea un database Postgres e copia la URL di connessione.

2. **Crea un nuovo progetto su Vercel** e collega la repository GitHub (privata o pubblica). Quando Vercel ti chiederà le variabili d'ambiente, inserisci:

   - `DATABASE_URL` con la URL del database gestito.
   - `JWT_SECRET` con un valore lungo e sicuro.

3. **Imposta i comandi di build** (Vercel auto-rileverà Next.js): non è necessario personalizzarli.

4. Dopo il primo deploy, la tua app sarà raggiungibile tramite l'URL generata da Vercel. Ricordati di eseguire le migrazioni iniziali sul database gestito (puoi eseguire manualmente lo script `infra/init.sql` usando un client psql o l'interfaccia grafica del provider).

## Comandi utili

- **Avvia il database**: `docker compose up -d` (dentro `infra/`)
- **Ferma il database**: `docker compose down` (dentro `infra/`)
- **Installa dipendenze**: `npm install` (dentro `apps/web/`)
- **Avvia l'app**: `npm run dev` (dentro `apps/web/`)
- **Esegui build**: `npm run build` (dentro `apps/web/`)

## Checklist MVP

- [x] Struttura monorepo definita
- [x] Database Postgres con script di inizializzazione
- [x] API integrate in Next.js (route handlers) per utenti, task e abitudini
- [x] Autenticazione con JWT (token salvato in localStorage)
- [x] Pagine login e registrazione
- [x] Dashboard con riepilogo task e abitudini
- [x] CRUD Task
- [x] CRUD Habits e logging giornaliero
- [x] Sezione placeholder “Latest Transactions” per modulo Finanza futuro
- [x] Predisposizione per entitlements e feature flags (tabelle nel DB)
- [x] Docker Compose per Postgres in locale
- [x] CI minimale con GitHub Actions (build)
- [ ] Valutazione UI finale e miglioramento dello stile
- [ ] Integrazione moduli premium (fase successiva)

---

Questo progetto è un primo passo verso una piattaforma modulare più ampia. L'obiettivo è che VITA sia **piacevole da usare** ogni giorno: se qualcosa non ti convince, modifica e adatta l'applicazione ai tuoi bisogni prima di pensare alla commercializzazione.
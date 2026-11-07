# Deutsch lernen

A personal app to learn German (B1). It is a PWA: you install it on Android and Windows, and it works fully offline.
The menus are in Russian. The content is in German.

- **Поиск:** with an empty search field, it shows the stats: cards due today, reviewed today, total cards. Type a German word to find it, also an inflected form ("ging" → gehen, "Hauser" → Häuser). See the article, plural, verb forms, Russian/English meaning and 5 example sentences.
- **Учить:** flashcards with FSRS (Снова / Трудно / Хорошо / Легко), DE → RU and RU → DE. Cards ask the meaning and the grammar: nouns with article and plural, verbs with Präteritum and Perfekt. On DE → RU noun cards, select der/die/das first. Optional typed answer: the app checks the German forms. Generated decks: grammar groups and topics. Maximum 20 new words a day; skip a new word with «Знаю» or «Не нужно».
- **Настройки** (cog icon): theme (system / light / dark), export and import of the deck as a JSON file, sources and licenses.

Keys on a desktop: `Space` shows the answer, `1`–`3` select der/die/das, `1`–`4` rate the card, `Enter` in the answer field shows the answer.

## Requirements

- Node.js 24 or later (ts-fsrs needs it).
- For the data script only: `bunzip2` and about 400 MB of free disk space. Linux, macOS and WSL have `bunzip2`. On Windows, run the data script in WSL.

## 1. Install

```bash
npm install
```

## 2. Make the dictionary data

```bash
npm run data
```

The script does these steps:

1. It downloads Tatoeba sentences (German, Russian, English) and the Kaikki.org extract of the German Wiktionary to `.cache/` (about 370 MB). It downloads each file only one time.
2. It ranks the words by their count in the Tatoeba sentences and keeps the 10,000 most frequent ones.
3. It writes `public/data/words.json`, `sentences.json`, `decks.json` and `meta.json` (about 8 MB).

The processing takes about 2 minutes and 1 GB of RAM. The first run also downloads about 370 MB; that time depends on your connection.
To keep a different number of words, give it as an argument: `npm run data -- 5000`.

`public/data/` is not in git. Run `npm run data` once before the first build.
After a new data build, the app imports the dictionary again (it compares `meta.json` → `version`). Your deck stays.

## 3. Development

| Command | Use |
| --- | --- |
| `npm run dev` | Fast development with hot reload. There is no service worker in this mode. |
| `npm run preview:watch` | Builds again after each change and serves the build on http://localhost:4173 with the service worker. Use it to test offline mode and the update toast. |
| `npm test` | Unit tests for the data scripts. |

## 4. Build

```bash
npm run build
```

The output is in `dist/`. It is a static site: copy `dist/` to any web server with HTTPS.
To look at the build on your computer:

```bash
npm run preview
```

### GitHub Pages

The app is on https://antreesy.github.io/lang-pwa/.
Each push to `main` runs [.github/workflows/pages.yml](.github/workflows/pages.yml): tests, dictionary data, build, deploy (about 3–5 minutes; about 1 minute when the data comes from the cache).

- The dictionary data is built again only when a data script changes.
- The downloaded source files are cached with the key `downloads-v1`. To get new Tatoeba and Wiktionary data, change it to `downloads-v2`.
- `meta.json` → `version` is a hash of the data. If the data is the same, the devices do not import the dictionary again.

### Other servers

If the app is not at the root of the domain (for example `https://example.com/deutsch/`), build with the path:

```bash
npx vite build --base=/deutsch/
```

## 5. Install the PWA

A PWA installs only from **HTTPS** or from **localhost**. A LAN address such as `http://192.168.1.10:4173` is not sufficient.

### Windows (Edge or Chrome)

1. Open the app URL (for example http://localhost:4173 or your HTTPS URL).
2. Click the install icon in the address bar. In Edge, you can also use **… → Apps → Install this site as an app**.
3. The app opens in its own window. It is in the Start menu.

### Android (Chrome)

1. Open https://antreesy.github.io/lang-pwa/ in Chrome on the phone (or your own HTTPS server).
2. Wait until the dictionary import is complete (about 20–30 s).
3. Open the Chrome menu **⋮ → Install app** (or **Add to Home screen**).

To test on a phone without HTTPS, use USB port forwarding:

1. Connect the phone with USB and turn on USB debugging.
2. On the computer, open `chrome://inspect/#devices` in Chrome.
3. Click **Port forwarding** and add `4173` → `localhost:4173`.
4. On the phone, open http://localhost:4173.

### Updates

When a new version is on the server, the app shows **«Доступна новая версия»**. Tap **Обновить** to load it.
If you tap **Позже**, the new version loads after you close all app windows.

## 6. Offline test

1. Run `npm run build`.
2. Run `npm run preview`.
3. Open http://localhost:4173. Wait until the dictionary import is complete.
4. Reload the page one time, so that the service worker controls it.
5. Stop the server (Ctrl+C). In DevTools → Network, select **Offline**.
6. Reload the page. Search a word, add it to the deck, and review it. All screens work.

Do not use Ctrl+Shift+R for this test: a hard reload does not use the service worker.

## Backup

The deck is only on the device until sync exists. Make backups:

1. Open **Настройки** (the cog icon), section **Резервная копия**.
2. Tap **Скачать файл**. The file name is `deutsch-deck-YYYY-MM-DD.json`.

To restore, tap **Выбрать файл…** on the same or another device. The import merges: a card keeps the version with more reviews, so an old file does not delete newer progress.

## Project structure

```
scripts/
  build-data.mjs     download and build public/data/
  lib.mjs            parse Kaikki entries, word forms, example scores
  decks.mjs          grammar and topic decks
  preview-watch.mjs  build on change + preview
  *.test.mjs         unit tests (npm test)
src/
  db/                all database access (Dexie). Change to PouchDB here for sync.
    index.ts         schema, word search
    seed.ts          import of public/data on first start and data update
    deck.ts          cards, reviews, decks, daily limit, stats
    backup.ts        JSON export and import
  srs.ts             ts-fsrs wrapper
  grammar.ts         grammar parts of a card, typed answer check (tests: grammar.test.ts)
  theme.ts           theme choice
  views/             one file per screen
  components/        WordCard, ArticleBadge, DeckButton, UpdateToast, StatsPanel, BackupSection
```

## Sources and licenses

- Example sentences: [Tatoeba](https://tatoeba.org), [CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/).
- Words, forms, translations, topics: German [Wiktionary](https://de.wiktionary.org) through [Kaikki.org](https://kaikki.org/dewiktionary/), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The generated dictionary data is a derivative work under the same license.
- Code libraries: Vue, Vue Router, ts-fsrs, vite-plugin-pwa, Workbox (MIT); Dexie.js (Apache-2.0).

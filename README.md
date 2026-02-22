# WaldorfWahlen

WaldorfWahlen ist eine Webanwendung, die es Waldorfschulen ermöglicht, Projektwahlen für ihre Schülerinnen und Schüler durchzuführen. Die Anwendung basiert auf **Vite** mit **React** und **TypeScript** für das Frontend sowie **Firebase** für Backend und Datenbank. Ein **Python-Flask-Backend** übernimmt die optimale Zuordnung von Schüler\*innen zu Projekten mittels linearer Programmierung.

---

## Funktionalitäten

- **Projektauswahl:** Schülerinnen und Schüler können aus einer Liste von verfügbaren Projekten auswählen und ihre Präferenzen angeben.
- **Administrative Funktionen:** Lehrkräfte und Administratoren haben Zugriff auf ein Dashboard, über das sie Projekte erstellen, bearbeiten und verwalten können.
- **Optimierte Zuordnung:** Die Zuordnung von Schüler\*innen zu Projekten erfolgt über einen LP-basierten Algorithmus (PuLP), der die Präferenzen bestmöglich berücksichtigt.
- **Auswertung & Export:** Statistiken, PDF-Export, Excel-Export und QR-Codes zum Teilen.
- **Multi-School-Support:** Unterstützung für mehrere Schulen über den SchoolContext.

---

## Technologien

| Bereich | Technologie |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| UI-Framework | [mdui](https://www.mdui.org/) |
| Backend / Datenbank | Firebase (Auth, Firestore, Hosting) |
| Zuordnungsalgorithmus | Python, Flask, PuLP |
| Tests | Vitest, Testing Library |
| CI/CD | GitHub Actions → Firebase Hosting |

---

## Installation

> **Hinweis:** Dieses Projekt verwendet **pnpm** als Paketmanager.

1. Repository klonen:

   ```bash
   git clone https://github.com/JohanGrims/waldorfwahlen.git
   cd WaldorfWahlen
   ```

2. Abhängigkeiten installieren:

   ```bash
   pnpm install
   ```

3. Entwicklungsserver starten:

   ```bash
   pnpm run dev
   ```

   Die Anwendung ist dann unter http://localhost:5173/ erreichbar.

---

## Verfügbare Skripte

| Befehl | Beschreibung |
| --- | --- |
| `pnpm run dev` | Startet den Vite-Entwicklungsserver mit HMR |
| `pnpm run build` | Erstellt einen Produktions-Build in `dist/` |
| `pnpm run preview` | Vorschau des Produktions-Builds |
| `pnpm run lint` | Führt ESLint aus |
| `pnpm run test` | Führt alle Tests einmalig aus |
| `pnpm run test:watch` | Führt Tests im Watch-Modus aus |
| `pnpm run test:coverage` | Führt Tests mit Coverage-Report aus |

---

## Tests

Das Projekt verwendet [Vitest](https://vitest.dev/) als Test-Framework zusammen mit [Testing Library](https://testing-library.com/).

```bash
# Alle Tests ausführen
pnpm run test

# Tests im Watch-Modus
pnpm run test:watch

# Mit Coverage-Report
pnpm run test:coverage
```

Test-Dateien liegen neben den Quelldateien mit dem Suffix `.test.ts` bzw. `.test.tsx`.

---

## Projektstruktur

```
src/
├── admin/           # Admin-Dashboard (Wahlen verwalten, Statistiken)
│   ├── auth/        # Login-Komponenten
│   ├── docs/        # Hilfe & Release Notes
│   ├── navigation/  # Drawer & Routing
│   └── vote/        # Wahldaten (Erstellen, Bearbeiten, Zuordnen, Teilen)
├── contexts/        # React Contexts (SchoolContext)
├── test/            # Test-Setup
├── utils/           # Hilfsfunktionen (Datum, etc.)
├── App.tsx          # Hauptseite mit Wahlübersicht
├── Vote.tsx         # Abstimmungsseite
├── Gateway.tsx      # Router-Gateway (leitet basierend auf Wahlstatus weiter)
└── firebase.ts      # Firebase-Konfiguration
python/
└── assign.py        # Flask-Server mit LP-Zuordnungsalgorithmus
```

---

## Python-Backend (Zuordnung)

Das Python-Backend (`python/assign.py`) verwendet PuLP für die optimale Schüler-Projekt-Zuordnung.

```bash
cd python
pip3 install -r requirements.txt
```

> **Hinweis:** Erfordert eine Firebase-Service-Account-Datei (`waldorfwahlen-service-account.json`), die aus Sicherheitsgründen nicht im Repository enthalten ist.

---

## Autor

WaldorfWahlen wurde von [@JohanGrims](https://github.com/johangrims) entwickelt.

## Status

[![Firebase Hosting](https://github.com/JohanGrims/WaldorfWahlen/actions/workflows/firebase-hosting-commit.yml/badge.svg)](https://github.com/JohanGrims/WaldorfWahlen/actions/workflows/firebase-hosting-commit.yml)

# WaldorfWahlen

WaldorfWahlen ist eine Webanwendung, die es der Waldorfschule Potsdam ermöglicht, Projektwahlen für ihre Schülerinnen und Schüler durchzuführen. Die Anwendung basiert auf dem Vite-Framework in Verbindung mit ReactJS für das Frontend und Firebase für das Backend und die Datenbank.

**🏫 Multi-School Support**: WaldorfWahlen kann jetzt für mehrere Schulen mit separaten Firebase-Projekten eingesetzt werden. Siehe [Multi-School Setup Guide](./MULTI_SCHOOL_SETUP.md) für Details.

---

## Funktionalitäten

- **Projektauswahl:** Schülerinnen und Schüler können aus einer Liste von verfügbaren Projekten auswählen und ihre Präferenzen angeben.
- **Administrative Funktionen:** Lehrkräfte und Administratoren haben Zugriff auf ein Dashboard, über das sie Projekte erstellen, bearbeiten und verwalten können.
- **Auswertung:** Die Anwendung bietet Möglichkeiten zur Auswertung der Wahlen und zur Zuweisung von Schülerinnen und Schülern zu den entsprechenden Projekten.

---

## Technologien

- **Frontend:** ReactJS
- **Backend / Datenbank:** Firebase

---

## Installation

1. Klone das Repository von GitHub:

   ```bash
   git clone https://github.com/JohanGrims/waldorfwahlen.git
   ```

2. Wechsle in das Verzeichnis des Projekts:
   ```bash
   cd WaldorfWahlen
   ```
3. Installiere die Abhängigkeiten:
   ```bash
   pnpm install
   ```
4. Starte den Entwicklungsserver:
   ```bash
   pnpm run dev
   ```

## Multi-School Setup

WaldorfWahlen unterstützt jetzt mehrere Schulen mit separaten Firebase-Projekten:

```bash
# Setup einer neuen Schule
pnpm run setup-school

# Build für eine bestimmte Schule
VITE_SCHOOL_ID=school1 pnpm run build

# Deployment aller Schulen
pnpm run deploy
```

Weitere Details finden Sie im [Multi-School Setup Guide](./MULTI_SCHOOL_SETUP.md).

---

## Autor

WaldorfWahlen wurde von [@JohanGrims](https://github.com/johangrims) entwickelt. Kontaktieren Sie mich bei Fragen oder Wünschen über Github Issues.

## Status

[![Firebase Hosting](https://github.com/JohanGrims/WaldorfWahlen/actions/workflows/firebase-hosting-commit.yml/badge.svg)](https://github.com/JohanGrims/WaldorfWahlen/actions/workflows/firebase-hosting-commit.yml)

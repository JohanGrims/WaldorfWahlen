import { doc, getDoc } from "firebase/firestore";
import React from "react";
import Markdown from "react-markdown";
import { useLoaderData } from "react-router-dom";
import { db } from "../firebase";

export default function Help() {
  const { helpContent } = useLoaderData() as {
    helpContent: { content: string };
  };

  return (
    <div className="mdui-prose">
      <h1>Hilfe & Kontakt</h1>
      <Markdown className="help">
        {`
## Einleitung
WaldorfWahlen ist eine Webanwendung, die der [Waldorfschule Potsdam](https://waldorfschule-potsdam.de) ermöglicht, Projektwahlen für Schülerinnen und Schüler durchzuführen und über ein Admin-Dashboard auszuwerten.

## Ablauf
1. **Wahl erstellen**: Loggen Sie sich unter [waldorfwahlen.web.app/admin](https://waldorfwahlen.web.app/admin) ein und klicken Sie auf "Erstellen".
2. **Wahl konfigurieren**: Geben Sie der Wahl einen Titel, fügen Sie optional eine Beschreibung hinzu und legen Sie die Anzahl der Wahlen pro SchülerIn fest. Fügen Sie mit "Extrafeld hinzufügen" weitere Felder hinzu, die die SchülerInnen ausfüllen müssen.
3. **Zeitraum festlegen**: Legen Sie den Zeitraum fest, in dem die Wahl stattfinden soll. Wählen Sie Start- und Enddatum sowie Start- und Endzeit.
4. **Optionen hinzufügen**: Fügen Sie die Optionen hinzu, die die SchülerInnen wählen können. Neben dem Titel müssen Sie eine Maximalanzahl an SchülerInnen festlegen, die diese Option wählen können. Optional können Sie den Lehrer und eine Beschreibung hinzufügen.
5. **Wahl starten**: Klicken Sie auf "Erstellen". Die Wahl ist nun aktiv und die SchülerInnen können in dem von Ihnen gewählten Zeitraum Projekte auswählen. Sie können die Wahl nun unter "Geplante Wahlen" anklicken, um zu den Optionen zu gelangen.
6. **Vorschau**: Klicken Sie auf "Vorschau", um die Wahl aus Sicht der SchülerInnen zu sehen.
7. **Teilen**: Teilen Sie den Link zur Wahl mit den SchülerInnen. Sie können einen QR-Code generieren, um den Link auszudrucken. Über die Einstellungen können Sie eine Mehrfachwahl erlauben.
8. **Bearbeiten**: Sie können unter "Bearbeiten" den Titel und die Beschreibung der Wahl ändern und die Optionen bearbeiten. Beachten Sie, dass gelöschte Optionen bei laufender Wahl zu Problemen führen können.
9. **Zeitraum ändern**: Sie können den Zeitraum der Wahl unter "Planen" ändern. Außerdem ist es möglich die Wahl zu deaktivieren, um sie zu einem späteren Zeitpunkt wieder zu aktivieren.
10. **Antworten**: Unter "Antworten" sehen Sie die Antworten der SchülerInnen. Über die verschiedenen Optionen können Sie die Antworten nach Erstwahl oder Klasse sortieren. "Nach Name" zeigt alle Antworten der SchülerInnen als Tabelle an. So können Sie nach SchülerInnen suchen und Antworten löschen.
11. **Abgleichen**: Unter "Abgleichen" können Sie die Antworten der SchülerInnen mit den Klassenlisten abgleichen. So können Sie sehen, welche SchülerInnen noch nicht gewählt haben. "Nach Datenbank" zeigt alle SchülerInnen an, die in der Datenbank sind. "Antworten" zeigt alle SchülerInnen an, die gewählt haben. Die Einträge können angeklickt werden, was die Antwort der SchülerInnen anzeigt.
12. **Zuteilen**: In der Automatischen Optimierung können Sie die SchülerInnen automatisch auf die Optionen verteilen. Über "Regeln anpassen" könne Sie hierfür Gewichtungen festlegen (Beispiel: SchülerInnen der Klasse 12 haben Vorrang). Über "Manuelle Zuordnung" können Sie die SchülerInnen auf Ihre Erstwahl setzen.
13. **Anpassen**: Nun können Sie die Zuteilung der SchülerInnen anpassen. Je nach Ansicht sehen Sie verschiedene Tabellen, die die SchülerInnen und Optionen anzeigen. Sie können die SchülerInnen durch Klicken auf den blauen Link zu einer anderen Option verschieben.
14. **Zuteilung speichern**: Durch Klicken auf "Ergebnisse speichern" werden die Zuteilungen in der Datenbank gespeichert. Sie können jederzeit überschrieben werden.
15. **Ergebnisse**: Unter "Ergebnisse" sehen Sie die Zuteilung der SchülerInnen. Über die verschiedenen Optionen können Sie die Ergebnisse nach Klasse oder Option sortieren. Drucken Sie die Ergebnisse aus, um sie an die LehrerInnen zu verteilen. Die Schaltfläche "Ergebnisse veröffentlichen" publiziert die Ergebnisse sicher für die SchülerInnen. Dafür müssen die SchülerInnen das Ergebnis auf demselben Gerät sehen, auf dem sie gewählt haben.
16. **Exportieren**: Sie können alle Daten einer Wahl als Excel-Datei exportieren. Wählen Sie dazu die gewünschte Wahl aus und klicken Sie auf "Exportieren". Für die korrekte Ansicht müssen Sie die Datei in Excel öffnen und gewisse XVerweise setzen.
17. **Wahl löschen**: Sie können eine Wahl unter "Löschen" ausblenden. Die Daten bleiben in der Datenbank erhalten, können aber nicht mehr eingesehen werden. Bei Bedarf zur Wiederherstellung wenden Sie sich bitte an mich.
---

## SchülerInnen
Die SchülerInnen-Datenbank enthält die Klassenlisten. Die SchülerInnen können in der Datenbank eingesehen und bearbeitet werden. Neue Klassen können über hinzufügen als Excel-Datei hochgeladen werden. Die SchülerInnen können über die Schaltfläche "Bearbeiten" bearbeitet werden.
- Excel-Formar: Bitte stellen Sie sicher, dass die Datei **im .xlsx-Format** vorliegt und das Format wie folgt ist: 1. Zeile — name | listIndex als Überschrift, danach für jede Zeile die individuellen Daten. Die Reihenfolge der Spalten ist nicht relevant. Es wird immer nur das erste Tabellenblatt gelesen.
- Mit **"Schuljahr wechseln"** werden alle Klassennummern um eins erhöht. Dies ist nützlich, wenn ein neues Schuljahr beginnt.
- Mit dem Stift-Symbol können die **Klassen bearbeitet** werden. Hier könne Sie die SchülerInnen als JSON-Datei bearbeiten oder über "Hochladen" eine Excel-Datei hochladen.
- Das Feld listIndex in der Datenbank gibt die **Reihenfolge der SchülerInnen** in der Klassenliste an.

## Einstellungen
Hier können Sie Ihren Account anpassen. Sie können Ihr Passwort ändern und vom standardmäßigen Darkmode auf den Lightmode wechseln. Der Darkmode ist für die Augen schonender und wird empfohlen. Bei Problemen kann es helfen, den Cache zu leeren.

${
  helpContent?.content ||
  "Haben Sie Fragen oder Probleme? Wenden Sie sich bitte an mich."
}
`}
      </Markdown>
    </div>
  );
}

Help.loader = async function loader() {
  const helpContent = await getDoc(doc(db, "docs", "help")); // Get contact information securely from Firestore (only accessible to admins)
  return { helpContent: helpContent.data() };
};

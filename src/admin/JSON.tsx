import React from "react";

let def = `{
    "id": "string", // ID der Wahl
    "active": boolean, // Aktiv
    "extraFields": ["string"], // Liste der zusätzlichen Felder
    "title": "string", // Titel
    "startTime": { "seconds": number, "nanoseconds": 0 }, // Startzeit
    "endTime": { "seconds": number, "nanoseconds": 0 }, // Endzeit
    "selectCount": number, // Anzahl der Wahlen
    "version": number, // Version (3)
    "result": boolean, // Ergebnisse veröffentlicht
    "description": "string", // Beschreibung
    "options": [ // Optionen
      {
        "id": "string", // ID der Option
        "teacher": "string", // Lehrer
        "max": number, // Max. Anzahl
        "description": "string", // Beschreibung
        "title": "string", // Titel
      },
    ]
    "choices": [ // Antworten
      {
        "id": "string", // ID der Antwort
        "grade": number, // Klasse
        "selected": ["string"], // Ausgewählte Optionen
        "name": "string", // Name
        "extraFields": ["string"], // Liste der zusätzlichen Felder
        "version": number, // Version (3)
        "listIndex": number, // Index in der Liste
        "timestamp": { "seconds": number, "nanoseconds": 0 }, // Zeitstempel
      },
    ]
    "results": [
      {
        "id": "string", // ID der Antwort
        "result": "string", // ID der Option
        "comments": [] // Kommentare (leer)
      },
    ]
}`;

const CodeBlock = ({ codeString = def }) => {
  // Funktion, um Kommentare zu markieren
  const highlightComments = (code) => {
    return code.split("\n").map((line, index) => {
      const parts = line.split("//");
      return (
        <div key={index}>
          {parts[0]}
          {parts[1] && <i style={{ fontWeight: "lighter" }}> // {parts[1]}</i>}
        </div>
      );
    });
  };

  return (
    <pre>
      <code style={{ backgroundColor: "transparent" }}>
        {highlightComments(codeString)}
      </code>
    </pre>
  );
};

export default CodeBlock;

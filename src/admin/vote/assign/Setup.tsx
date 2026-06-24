import React from "react";
import { VoteData, ResultData } from "./types";
import { Rule } from "../../../utils/assign";

interface Props {
  vote: VoteData;
  cloudResults: ResultData[];
  setCloudResults: () => void;
  fetchOptimization: () => void;
  assignToFirstChoice: () => void;
  loading: boolean;
  rules: Rule[];
  switchRef: React.RefObject<HTMLInputElement>;
  setEditRules: (edit: boolean) => void;
}

export default function Setup({
  vote,
  cloudResults,
  setCloudResults,
  fetchOptimization,
  assignToFirstChoice,
  loading,
  rules,
  switchRef,
  setEditRules,
}: Props) {
  if (loading) {
    return (
      <div className="mdui-prose">
        <h2>Automatische Optimierung</h2>
        Die Möglichkeiten werden optimiert. Dies kann einige Sekunden dauern.
        Bitte warten.
        <mdui-linear-progress></mdui-linear-progress>
        <p />
        <div
          style={{
            fontStyle: "italic",
            color: "gray",
          }}
        >
          Um alle möglichen Kombinationen zu berechnen, würde es mit 100
          Schülern und 3 Wahlen länger dauern als das Universum alt ist. Es gäbe
          nämlich {Math.pow(3, 100)} mögliche Kombinationen. So lange wollen wir
          nicht warten. Deshalb optimiert ein schlauer Algorithmus für uns. Die
          Berechnungsdauer hängt von der Anzahl der Schüler und der Anzahl der
          Wahlen ab. Bei vielen Schülern und Wahlen kann es einige Sekunden
          dauern. Gleich ist es fertig.
        </div>
      </div>
    );
  }

  return (
    <div className="mdui-prose">
      <div
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "space-between",
          alignItems: "start",
        }}
      >
        <h2>Zuteilung starten</h2>
        <mdui-button icon="settings" onClick={() => setEditRules(true)}>
          Regeln anpassen
        </mdui-button>
      </div>
      <p />
      {cloudResults.length > 0 && (
        <mdui-card
          variant="outlined"
          style={{ width: "100%", padding: "20px", marginBottom: "16px" }}
          clickable
          onClick={setCloudResults}
        >
          <div className="mdui-prose" style={{ width: "100%" }}>
            <div
              style={{
                display: "flex",
                textWrap: "nowrap",
                gap: "10px",
              }}
            >
              <h2 style={{ marginBottom: "0px" }}>Letzte Ergebnisse laden</h2>
              <mdui-icon name="cloud"></mdui-icon>
            </div>
          </div>
        </mdui-card>
      )}

      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          padding: "10px",
        }}
      >
        {rules.some((rule) => rule.apply === "grade=12") ? (
          <mdui-switch ref={switchRef} checked></mdui-switch>
        ) : (
          <mdui-switch ref={switchRef}></mdui-switch>
        )}

        {rules.some((rule) => rule.apply === "grade=12") ? (
          <label>12. Klässler werden priorisiert</label>
        ) : (
          <label>12. Klässler werden nicht priorisiert</label>
        )}
      </div>
      <mdui-card
        variant="filled"
        style={{ width: "100%", padding: "20px", marginBottom: "16px" }}
        clickable
        disabled={Number(vote.selectCount) !== 3}
        onClick={fetchOptimization}
      >
        <div className="mdui-prose" style={{ width: "100%", userSelect: "none" }}>
          <div
            style={{
              display: "flex",
              textWrap: "nowrap",
              gap: "10px",
            }}
          >
            <h2>Automatische Optimierung</h2>
            <mdui-icon name="auto_awesome"></mdui-icon>
          </div>
          {Number(vote.selectCount) !== 3 && (
            <b>Nur bei 3 Wahlen verfügbar — </b>
          )}
          Diese Funktion ordnet die Schüler bestmöglich den Projekten zu. Es ist
          möglich, erzeugte Ergebnisse im Anschluss manuell zu ändern.
        </div>
      </mdui-card>
      <mdui-card
        variant="outlined"
        style={{ width: "100%", padding: "20px" }}
        clickable
        onClick={assignToFirstChoice}
      >
        <div className="mdui-prose" style={{ width: "100%", userSelect: "none" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div style={{ gap: "10px", textWrap: "nowrap", display: "flex" }}>
              <h2>Manuelle Zuordnung</h2>
              <mdui-icon name="touch_app"></mdui-icon>
            </div>
            <div>Beta</div>
          </div>
          Diese Funktion ermöglicht es, die Schüler manuell den Projekten
          zuzuordnen. Dabei wird zunächst bei jedem Schüler von der Erstwahl ausgegangen.
        </div>
      </mdui-card>
    </div>
  );
}

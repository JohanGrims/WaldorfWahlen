export default function Export() {
  return (
    <div className="mdui-prose">
      <h2>Exportieren</h2>
      <p></p>
      <mdui-card
        variant="elevated"
        style={{ width: "100%", padding: "20px" }}
        clickable
        disabled
      >
        <div
          className="mdui-prose"
          style={{ width: "100%", userSelect: "none" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div style={{ gap: "10px", textWrap: "nowrap", display: "flex" }}>
              <h2>Alle Daten exportieren</h2>
              <mdui-icon name="done_all"></mdui-icon>
            </div>
            <div>Noch nicht verfügbar</div>
          </div>
          Laden Sie alle Daten in einer Excel Datei herunter. Dazu gehören alle
          Optionen, Metadaten, Antworten und Ergebnisse.
        </div>
      </mdui-card>
      <mdui-card
        variant="outlined"
        style={{ width: "100%", padding: "20px" }}
        clickable
        disabled
      >
        <div
          className="mdui-prose"
          style={{ width: "100%", userSelect: "none" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div style={{ gap: "10px", textWrap: "nowrap", display: "flex" }}>
              <h2>Daten auswählen</h2>
              <mdui-icon name="toggle_on"></mdui-icon>
            </div>
            <div>Noch nicht verfügbar</div>
          </div>
          Wählen Sie aus, welche Daten Sie exportieren möchten und in welchem
          Format. Sie können auch nur bestimmte Daten exportieren.
        </div>
      </mdui-card>
    </div>
  );
}

export default function Edit() {
  return (
    <div className="mdui-prose">
      <h2>Bearbeiten</h2>
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
              <h2>Wahl bearbeiten</h2>
              <mdui-icon name="edit"></mdui-icon>
            </div>
            <div>Noch nicht verfügbar</div>
          </div>
          Bearbeiten Sie die Optionen, Metadaten und Einstellungen der Wahl.
          Diese Funktion kommt in einem späteren Update.
        </div>
      </mdui-card>
    </div>
  );
}

import { auth } from "../firebase";

export default function Settings() {
  return (
    <div className="mdui-prose">
      <h1>Einstellungen</h1>
      <h3>Account</h3>
      <mdui-text-field
        label="E-Mail"
        type="email"
        required
        value={auth.currentUser.email}
        disabled
      ></mdui-text-field>
      <mdui-text-field
        label="Passwort"
        type="password"
        required
        disabled
      ></mdui-text-field>
      <p />
      <div className="button-container">
        <mdui-button variant="text">Passwort ändern</mdui-button>
        <p />
        <mdui-button onClick={() => auth.signOut()}>Abmelden</mdui-button>
      </div>
      <h3>Aussehen</h3>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <mdui-switch
          checked-icon="dark_mode"
          unchecked-icon="light_mode"
          checked
        ></mdui-switch>
        <label>Dark Mode</label>
      </div>
      <p />
      <br />
      <p>Bei Problemen mit der Anzeige kann es helfen, den Cache zu leeren.</p>
      <mdui-button onClick={() => localStorage.clear()} variant="tonal">
        Cache leeren
      </mdui-button>
      <p />
    </div>
  );
}

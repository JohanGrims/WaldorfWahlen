import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
} from "firebase/auth";
import { setTheme, snackbar } from "mdui";
import React from "react";
import { auth } from "../firebase";
import { Helmet } from "react-helmet";

export default function Settings() {
  const [email, setEmail] = React.useState(auth.currentUser.email);
  const [password, setPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");

  const [darkMode, setDarkMode] = React.useState(
    localStorage.getItem("theme") === "light"
  );

  function updateUser() {
    const userCredentials = EmailAuthProvider.credential(
      auth.currentUser.email,
      password
    );
    reauthenticateWithCredential(auth.currentUser, userCredentials)
      .then(() => {
        if (newPassword) {
          changePassword();
        }
        if (email !== auth.currentUser.email) {
          changeEmail();
        }
      })
      .catch((error) => {
        console.error(error);
      });
  }

  function changeEmail() {
    updateEmail(auth.currentUser, email)
      .then(() => {
        snackbar({ message: "E-Mail-Adresse geändert" });
      })
      .catch((error) => {
        console.error(error);
      });
  }

  function changePassword() {
    updatePassword(auth.currentUser, password)
      .then(() => {
        snackbar({ message: "Passwort geändert" });
      })
      .catch((error) => {
        console.error(error);
      });
  }

  const switchRef = React.useRef(null);

  React.useEffect(() => {
    const handleToggle = () => {
      setDarkMode(switchRef.current.checked);
      localStorage.setItem(
        "theme",
        switchRef.current.checked ? "dark" : "light"
      );
      setTheme(switchRef.current.checked ? "dark" : "light");
    };

    switchRef.current.addEventListener("change", handleToggle);
  }, []);

  return (
    <div className="mdui-prose">
      <Helmet>
        <title>Einstellungen - WaldorfWahlen</title>
      </Helmet>
      <h1>Einstellungen</h1>
      <h3>Account</h3>
      <mdui-text-field
        label="E-Mail"
        type="email"
        required
        value={email}
        onInput={(e) => setEmail(e.target.value)}
      ></mdui-text-field>
      <mdui-text-field
        label="Passwort"
        type="password"
        required
        value={password}
        onInput={(e) => setPassword(e.target.value)}
      ></mdui-text-field>
      <mdui-text-field
        label="Neues Passwort"
        type="password"
        required
        value={newPassword}
        onInput={(e) => setNewPassword(e.target.value)}
      ></mdui-text-field>
      <p />
      <div className="button-container">
        <mdui-button variant="text" onClick={updateUser}>
          Speichern
        </mdui-button>
        <p />
        <mdui-button onClick={() => auth.signOut()}>Abmelden</mdui-button>
      </div>
      <h3>Aussehen</h3>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <mdui-switch
          checked-icon="dark_mode"
          unchecked-icon="light_mode"
          checked={localStorage.getItem("theme") !== "light"}
          ref={switchRef}
        ></mdui-switch>
        <label>Dark Mode</label>
      </div>
      <p />
      <br />
      <p>Bei Problemen mit der Anzeige kann es helfen, den Cache zu leeren.</p>
      <mdui-button
        onClick={() => {
          localStorage.clear();
          snackbar({
            message: "Cache geleert",
            action: "Neu laden",
            onActionClick: () => window.location.reload(),
          });
        }}
        variant="tonal"
      >
        Cache leeren
      </mdui-button>
      <p />
    </div>
  );
}

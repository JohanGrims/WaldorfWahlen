import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { alert, prompt, snackbar } from "mdui";
import React from "react";
import { auth } from "../../firebase";

export default function Login() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const handleLogin = () => {
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        console.log(userCredential);
      })
      .catch((error) => {
        snackbar({
          message: error.message,
        });
      });
  };

  const handlePasswordReset = () => {
    prompt({
      headline: "Passwort zurücksetzen",
      description: "Bitte gib deine Email-Adresse ein.",
      confirmText: "Senden",
      cancelText: "Abbrechen",
      closeOnOverlayClick: true,
      textFieldOptions: {
        placeholder: "user@example.com",
        type: "email",
        label: "Email",
      },
      onConfirm: (email) => {
        sendPasswordResetEmail(auth, email)
          .then(() => {
            alert({
              headline: "Email gesendet",
              description: "Bitte überprüfen Sie Ihren Posteingang.",
            });
          })
          .catch((error) => {
            console.error(error);
          });
      },
    });
  };

  return (
    <mdui-card variant="filled" class="card">
      <div className="mdui-prose">
        <h1>Login</h1>
        <mdui-text-field
          value={email}
          onInput={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="user@example.com"
          label="Email"
        />
        <p />
        <mdui-text-field
          value={password}
          onInput={(e) => setPassword(e.target.value)}
          type="password"
          label="Passwort"
          toggle-password
        />
        <p />
        <br />
        <div className="button-container">
          <mdui-button variant="text" onClick={handlePasswordReset}>
            Passwort zurücksetzen
          </mdui-button>
          <mdui-button onClick={handleLogin}>Login</mdui-button>
        </div>
      </div>
    </mdui-card>
  );
}

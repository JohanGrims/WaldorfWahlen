import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { alert, prompt, snackbar } from "mdui";
import React from "react";
import { auth } from "../../firebase";

export default function Login() {
  const [loading, setLoading] = React.useState(false);
  interface LoginFormElements extends HTMLFormControlsCollection {
    email: HTMLInputElement;
    password: HTMLInputElement;
  }

  interface LoginForm extends HTMLFormElement {
    readonly elements: LoginFormElements;
  }

  const handleLogin = (e: React.FormEvent<LoginForm>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    setLoading(true);

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        window.location.reload();
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
        if (error.code === "auth/user-not-found") {
          snackbar({
            message: "Benutzer nicht gefunden.",
          });
          return;
        }
        if (error.code === "auth/wrong-password") {
          snackbar({
            message: "Falsches Passwort.",
          });
          return;
        }
        if (error.code === "auth/too-many-requests") {
          snackbar({
            message: "Zu viele Anfragen. Bitte versuchen Sie es später erneut.",
          });
          return;
        }
        if (error.code === "auth/invalid-email") {
          snackbar({
            message: "Ungültige Email-Adresse.",
          });
          return;
        }

        snackbar({
          message:
            "Ein Fehler ist aufgetreten. Bitte kontaktieren Sie den Administrator.",
        });
      });
  };

  const handlePasswordReset = () => {
    prompt({
      headline: "Passwort zurücksetzen",
      description: "Bitte geben Sie Ihre Email-Adresse ein.",
      confirmText: "Senden",
      cancelText: "Abbrechen",
      closeOnOverlayClick: true,
      textFieldOptions: {
        placeholder: "user@example.com",
        type: "email",
        label: "Email",
      },
      onConfirm: (email) => {
        setLoading(true);
        sendPasswordResetEmail(auth, email)
          .then(() => {
            alert({
              headline: "Email gesendet",
              description: "Bitte überprüfen Sie Ihren Posteingang.",
            });
            setLoading(false);
          })
          .catch((error) => {
            console.error(error);
            alert({
              headline: "Fehler",
              description: error.message,
            });
            setLoading(false);
          });
      },
    });
  };

  return (
    <mdui-card variant="filled" class="card" style={{ position: "absolute" }}>
      {loading && (
        <mdui-linear-progress
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
          }}
        />
      )}
      <div className="mdui-prose">
        <h1>Administratoren-Bereich</h1>
        <form onSubmit={handleLogin}>
          <mdui-text-field
            type="email"
            placeholder="user@example.com"
            label="Email"
            name="email"
            required
          ></mdui-text-field>
          <p />
          <mdui-text-field
            type="password"
            label="Passwort"
            toggle-password
            name="password"
            required
          />
          <p />
          <br />
          <div className="button-container">
            {loading ? (
              <>
                <mdui-button variant="text" disabled>
                  Passwort zurücksetzen
                </mdui-button>

                <mdui-button disabled>Login</mdui-button>
              </>
            ) : (
              <>
                <mdui-button variant="text" onClick={handlePasswordReset}>
                  Passwort zurücksetzen
                </mdui-button>

                <mdui-button type="submit">Login</mdui-button>
              </>
            )}
          </div>
        </form>
      </div>
    </mdui-card>
  );
}

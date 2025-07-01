import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { alert, prompt, snackbar } from "mdui";
import React from "react";
import { auth } from "../../firebase";

export default function Login() {
  const [loading, setLoading] = React.useState<boolean>(false);

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
      .catch((error: any) => {
        console.error(error);
        setLoading(false);
        if (error.code === "auth/invalid-credential") {
          snackbar({
            message: "Ungültige Anmeldeinformationen.",
          });
          return;
        }
        if (error.code === "auth/too-many-requests") {
          alert({
            icon: "hourglass_disabled",
            headline: "Zu viele Anfragen",
            description:
              "Zu viele Anfragen. Bitte versuchen Sie es später erneut.",
          });
          return;
        }
        if (error.code === "auth/invalid-email") {
          snackbar({
            message: "Ungültige Email-Adresse.",
          });
          return;
        }

        if (error.code === "auth/user-disabled") {
          alert({
            icon: "remove_moderator",
            headline: "Account deaktiviert",
            description:
              "Ihr Account ist deaktiviert. Dies bedeutet, dass Sie nicht auf das System zugreifen können. Bitte kontaktieren Sie einen Administrator.",
          });
          return;
        }

        snackbar({
          message:
            "Ein Fehler ist aufgetreten. Bitte kontaktieren Sie einen Administrator.",
        });
      });
  };

  const handlePasswordReset = () => {
    prompt({
      icon: "lock",
      headline: "Passwort zurücksetzen",
      description: "Bitte geben Sie Ihre Email-Adresse ein.",
      confirmText: "Senden",
      cancelText: "Abbrechen",
      closeOnOverlayClick: true,
      textFieldOptions: {
        placeholder: "nutzer@waldorfschule-potsdam.de",
        type: "email",
        label: "Email",
      },
      onConfirm: (email: string) => {
        setLoading(true);
        sendPasswordResetEmail(auth, email)
          .then(() => {
            alert({
              icon: "check",
              headline: "Email gesendet",
              description: "Bitte überprüfen Sie Ihren Posteingang.",
            });
            setLoading(false);
          })
          .catch((error: any) => {
            console.error(error);
            alert({
              icon: "error",
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
            placeholder="nutzer@waldorfschule-potsdam.de"
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

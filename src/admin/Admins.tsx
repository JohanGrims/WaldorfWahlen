import React from "react";
import { useLoaderData, useRevalidator } from "react-router-dom";

import { auth } from "../firebase";
import { alert, confirm, prompt, snackbar } from "mdui";
import { getToken } from "firebase/app-check";

interface AdminUser {
  email: string;
  uid: string;
  disabled: boolean;
}

interface LoaderData {
  admins: AdminUser[];
}

export default function Admins() {
  const { admins } = useLoaderData() as LoaderData;

  const revalidator = useRevalidator();

  async function createAdmin() {
    // Create random password (40 characters)
    const array = new Uint8Array(40);
    window.crypto.getRandomValues(array);
    const password = Array.from(array, (byte) =>
      ("0" + byte.toString(36)).slice(-1)
    ).join("");

    prompt({
      icon: "person_add",
      headline: "E-Mail",
      confirmText: "Erstellen",
      cancelText: "Abbrechen",
      textFieldOptions: {
        placeholder: "nutzer@waldorfschule-potsdam.de",
      },
      onConfirm: async (email: string) => {
        let token: string;
        await fetch(
          `https://api.chatwithsteiner.de/waldorfwahlen/users?token=${await auth.currentUser?.getIdToken()}&uid=${
            auth.currentUser?.uid
          }`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
          }
        ).then(() => {
          alert({
            icon: "check",
            headline: "Admin erstellt",
            description: `Der Admin ${email} wurde erstellt. Bitten Sie den Admin, sein Passwort vor dem ersten Login zurückzusetzen. Anschließend bekommt er eine E-Mail mit einem Link zum Festlegen des Passworts.`,
            confirmText: "OK",
          });
          revalidator.revalidate();
        });
      },
    });
  }

  async function updateAdmin(uid: string, disabled: boolean) {
    const email = admins.find((admin) => admin.uid === uid)?.email;

    confirm({
      icon: "warning",
      headline: "Bestätigen",
      description: disabled
        ? `Möchten Sie den Admin ${email} wirklich aktivieren?`
        : `Möchten Sie den Admin ${email} wirklich deaktivieren?`,
      confirmText: "Ja",
      cancelText: "Nein",
      onConfirm: async () => {
        const result = await fetch(
          `https://api.chatwithsteiner.de/waldorfwahlen/users?token=${await auth.currentUser?.getIdToken()}&uid=${
            auth.currentUser?.uid
          }&user_id=${uid}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ disabled }),
          }
        ).then(() => {
          snackbar({
            message: `Admin ${email} ${
              !disabled ? "aktiviert" : "deaktiviert"
            }!`,
          });

          revalidator.revalidate();
        });
      },
    });
  }

  async function deleteAdmin(uid: string) {
    const email = admins.find((admin) => admin.uid === uid)?.email;

    if (!email) {
      return;
    }

    confirm({
      icon: "warning",
      headline: "Bestätigen",
      description: `Möchten Sie den Admin ${email} wirklich löschen?`,
      confirmText: "Ja",
      cancelText: "Nein",
      onConfirm: async () => {
        const result = await fetch(
          `https://api.chatwithsteiner.de/waldorfwahlen/users?token=${await auth.currentUser?.getIdToken()}&uid=${
            auth.currentUser?.uid
          }&user_id=${uid}`,
          {
            method: "DELETE",
          }
        ).then(() => {
          snackbar({
            message: `Admin ${email} gelöscht!`,
          });
          revalidator.revalidate();
        });
      },
    });
  }

  return (
    <div className="mdui-prose">
      <h2>Administratoren</h2>
      <p>
        Administratoren können die Wahl konfigurieren und die Ergebnisse
        einsehen. Erstellen Sie einen neuen Admin, indem Sie auf das Plus-Symbol
        klicken. Deaktivierte Admins können sich nicht einloggen.
      </p>
      <p />
      <mdui-list>
        {admins
          .sort((a, b) => a.email.localeCompare(b.email))
          .map((admin) => (
            <mdui-list-item rounded key={admin.uid}>
              <mdui-avatar slot="icon">
                {admin.email
                  .split(/[@.]/)
                  .slice(0, 2)
                  .map((part) => part.charAt(0).toUpperCase())
                  .join("")}
              </mdui-avatar>

              <div>
                {admin.email}{" "}
                {admin.disabled && <mdui-badge>Deaktiviert</mdui-badge>}
              </div>

              <mdui-dropdown slot="end-icon">
                <mdui-button-icon
                  slot="trigger"
                  icon="more_vert"
                ></mdui-button-icon>
                <mdui-menu>
                  <mdui-list-item
                    onClick={() => {
                      navigator.clipboard.writeText(admin.uid);
                      snackbar({
                        message: "User-ID kopiert!",
                      });
                    }}
                    icon="content_copy"
                  >
                    User-ID kopieren
                  </mdui-list-item>
                  <mdui-list-item
                    onClick={() => {
                      updateAdmin(admin.uid, !admin.disabled);
                    }}
                    icon={!admin.disabled ? "lock" : "lock_open"}
                    disabled={admin.uid === auth.currentUser?.uid}
                  >
                    {admin.disabled ? "Aktivieren" : "Deaktivieren"}
                  </mdui-list-item>
                  <mdui-list-item
                    icon="delete"
                    onClick={() => {
                      deleteAdmin(admin.uid);
                    }}
                    disabled={admin.uid === auth.currentUser?.uid}
                  >
                    Löschen
                  </mdui-list-item>
                </mdui-menu>
              </mdui-dropdown>
            </mdui-list-item>
          ))}
      </mdui-list>

      <mdui-fab
        style={{
          position: "fixed",
          right: "20px",
          bottom: "20px",
        }}
        onClick={createAdmin}
        icon="person_add"
        extended
      >
        Admin erstellen
      </mdui-fab>
    </div>
  );
}

Admins.loader = async () => {
  // get firebase token
  const token = await new Promise<string | null>((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const token = await user.getIdToken();
        resolve(token);
      } else {
        resolve(null);
      }
      unsubscribe();
    });
  });

  // Fetch list of admins
  if (!token) {
    return { admins: [] };
  }

  const response = await fetch(
    `https://api.chatwithsteiner.de/waldorfwahlen/users?token=${token}&uid=${auth.currentUser?.uid}`,
    {
      headers: {},
    }
  );
  if (!response.ok) {
    throw new Response("Abruf fehlgeschlagen", {
      status: response.status,
      statusText: response.statusText || "Unbekannter Fehler",
    });
  }
  const admins = await response.json();
  return { admins };
};

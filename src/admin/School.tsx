import React, { useState } from "react";
import { useLoaderData, useRevalidator } from "react-router-dom";
import "mdui/components/text-field.js";

import { auth, db } from "../firebase";
import { alert, confirm, prompt, snackbar } from "mdui";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { SchoolData } from "../types";

interface AdminUser {
  email: string;
  uid: string;
  disabled: boolean;
}

interface LoaderData {
  admins: AdminUser[];
  schoolData: SchoolData;
}

export default function School() {
  const { admins, schoolData } = useLoaderData() as LoaderData;

  const revalidator = useRevalidator();
  const [isEditing, setIsEditing] = useState(false);
  const [editedSchoolData, setEditedSchoolData] = useState(schoolData);

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
        await fetch(
          `https://api.chatwithsteiner.de/waldorfwahlen/users?token=${await auth.currentUser?.getIdToken()}&uid=${
            auth.currentUser?.uid
          }`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password, project: "SCHOOLID" }),
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

  async function saveSchoolData() {
    try {
      await updateDoc(doc(db, "schools/SCHOOLID"), editedSchoolData);
      snackbar({ message: "Schuldaten erfolgreich aktualisiert!" });
      revalidator.revalidate();
      setIsEditing(false);
    } catch (error) {
      alert({
        icon: "error",
        headline: "Fehler",
        description: "Die Schuldaten konnten nicht aktualisiert werden.",
        confirmText: "OK",
      });
    }
  }

  return (
    <div className="mdui-prose">
      <h1>Schuleinstellungen</h1>
      <mdui-card
        variant="filled"
        style={{
          width: "100%",
          padding: "20px",
          display: "flex",
          flexDirection: "row",
        }}
      >
        {isEditing ? (
          <div style={{ flexGrow: 1 }}>
            <mdui-text-field
              label="Schulname"
              value={editedSchoolData.name}
              onInput={(e: any) =>
                setEditedSchoolData({
                  ...editedSchoolData,
                  name: e.target.value,
                })
              }
            ></mdui-text-field>
            <mdui-text-field
              label="Kurzname"
              value={editedSchoolData.shortName}
              onInput={(e: any) =>
                setEditedSchoolData({
                  ...editedSchoolData,
                  shortName: e.target.value,
                })
              }
            ></mdui-text-field>
            <mdui-text-field
              label="Link"
              value={editedSchoolData.link}
              onInput={(e: any) =>
                setEditedSchoolData({
                  ...editedSchoolData,
                  link: e.target.value,
                })
              }
            ></mdui-text-field>
            <mdui-text-field
              label="Icon-URL"
              value={editedSchoolData.icon}
              onInput={(e: any) =>
                setEditedSchoolData({
                  ...editedSchoolData,
                  icon: e.target.value,
                })
              }
            ></mdui-text-field>
            <mdui-text-field
              label="Primärfarbe"
              value={editedSchoolData.primaryColor}
              onInput={(e: any) =>
                setEditedSchoolData({
                  ...editedSchoolData,
                  primaryColor: e.target.value,
                })
              }
            ></mdui-text-field>
            <p />
            <mdui-button
              onClick={saveSchoolData}
              style={{ marginRight: "10px" }}
            >
              Speichern
            </mdui-button>
            <mdui-button onClick={() => setIsEditing(false)} variant="outlined">
              Abbrechen
            </mdui-button>
          </div>
        ) : (
          <>
            <div style={{ flexGrow: 1 }}>
              <h2 style={{ marginBottom: "10px" }}>
                {schoolData.name}{" "}
                <span style={{ color: "gray", fontStyle: "italic" }}>
                  ({schoolData.shortName})
                </span>
              </h2>
              <span>{schoolData.link}</span>
            </div>
            <img
              src={schoolData.icon}
              alt="Logo"
              style={{ height: "50px", width: "50px", marginTop: "0px" }}
            />
            <div
              style={{
                height: "50px",
                width: "50px",
                borderRadius: "50%",
                marginLeft: "10px",
                marginRight: "50px",
                backgroundColor: schoolData.primaryColor,
              }}
            ></div>
          </>
        )}

        {!isEditing && (
          <mdui-button-icon
            icon="edit"
            onClick={() => setIsEditing(true)}
          ></mdui-button-icon>
        )}
      </mdui-card>

      <h2>LehrerInnen</h2>
      <p>
        LehrerInnen können die Wahl konfigurieren und die Ergebnisse einsehen.
        Erstellen Sie eine/n neue/n LehrerIn, indem Sie auf das Plus-Symbol
        klicken. Deaktivierte LehrerInnen können sich nicht einloggen.
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

        <mdui-list-item rounded onClick={createAdmin}>
          <mdui-avatar slot="icon">
            <mdui-icon>person_add</mdui-icon>
          </mdui-avatar>
          LehrerIn hinzufügen
        </mdui-list-item>
      </mdui-list>
    </div>
  );
}

School.loader = async () => {
  const school = await getDoc(doc(db, "schools/SCHOOLID"));
  const schoolData = school.data();
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
  return { admins, schoolData };
};

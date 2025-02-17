import { doc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { snackbar } from "mdui";
import React from "react";
import Markdown from "react-markdown";
import { useLoaderData, useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";

export default function CreateHelp() {
  const { helpContent } = useLoaderData() as {
    helpContent: { content: string; updated?: Timestamp; updatedBy?: string };
  };
  const [content, setContent] = React.useState(helpContent.content);

  const [publishing, setPublishing] = React.useState(false);

  const navigate = useNavigate();

  async function publishHelpContent() {
    setPublishing(true);
    setDoc(doc(db, "docs", "help"), {
      content,
      updated: serverTimestamp(),
      updatedBy: auth.currentUser?.email,
    })
      .then(() => {
        snackbar({ message: "Veröffentlicht" });
        setPublishing(false);
        navigate("/admin/help");
      })
      .catch(() => {
        snackbar({ message: "Fehler beim Speichern" });
        setPublishing(false);
      });
  }

  return (
    <div className="mdui-prose">
      <mdui-tabs value="edit">
        <mdui-tab
          onClick={() => {
            navigate(-1);
          }}
        >
          Zurück
        </mdui-tab>
        <mdui-tab value="edit">Bearbeiten</mdui-tab>
        <mdui-tab value="preview">Vorschau</mdui-tab>

        <mdui-tab-panel slot="panel" value="edit">
          <p />
          <mdui-text-field
            variant="outlined"
            autosize
            min-rows={15}
            label="Inhalt"
            value={content}
            onInput={(e) => setContent((e.target as HTMLInputElement).value)}
          ></mdui-text-field>
        </mdui-tab-panel>
        <mdui-tab-panel slot="panel" value="preview">
          <div className="mdui-prose">
            <p />
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "start",
              }}
            >
              <h1>Hilfe & Kontakt</h1>
            </div>
            <p />
            <Markdown className="help">{content}</Markdown>
            <p />
            <i
              style={{
                display: "block",
                textAlign: "right",
                fontSize: "0.8em",
              }}
            >
              zuletzt aktualisiert am{" "}
              {helpContent.updated
                ? new Date(helpContent.updated.seconds * 1000).toLocaleString(
                    "de-DE",
                    {
                      dateStyle: "medium",
                    }
                  )
                : "-"}{" "}
              von {helpContent.updatedBy || "-"}
            </i>
          </div>
        </mdui-tab-panel>
      </mdui-tabs>

      <div className="fixed-action">
        {publishing ? (
          <mdui-fab icon="public" loading extended>
            Veröffentlichen
          </mdui-fab>
        ) : (
          <mdui-tooltip
            variant="rich"
            headline="Veröffentlichen"
            content="Veröffentlicht die Änderungen, sodass sie für alle Benutzer sichtbar sind. Diese Aktion kann nicht rückgängig gemacht. Ihre E-Mail-Adresse wird als Autor gespeichert."
          >
            <mdui-fab icon="public" extended onClick={publishHelpContent}>
              Veröffentlichen
            </mdui-fab>
          </mdui-tooltip>
        )}
      </div>
    </div>
  );
}

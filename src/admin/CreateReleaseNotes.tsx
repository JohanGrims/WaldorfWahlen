import { doc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { snackbar } from "mdui";
import React from "react";
import Markdown from "react-markdown";
import { useLoaderData, useNavigate } from "react-router-dom";
import { db } from "../firebase";

export default function CreateReleaseNotes() {
  const { releaseNotes } = useLoaderData() as {
    releaseNotes: { content: string; updated: Timestamp };
  };
  const [content, setContent] = React.useState(releaseNotes.content);

  const [publishing, setPublishing] = React.useState(false);

  const navigate = useNavigate();

  async function publishReleaseNotes() {
    setPublishing(true);
    setDoc(doc(db, "docs", "release-notes"), {
      content,
      updated: serverTimestamp(),
    })
      .then(() => {
        snackbar({ message: "Veröffentlicht" });
        setPublishing(false);
        navigate("/admin/changelog");
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
          <p />
          <Markdown className={"help"}>{content}</Markdown>
        </mdui-tab-panel>
      </mdui-tabs>

      <div className="fixed-action">
        {publishing ? (
          <mdui-fab icon="public" loading extended>
            Veröffentlichen
          </mdui-fab>
        ) : (
          <mdui-fab icon="public" extended onClick={publishReleaseNotes}>
            Veröffentlichen
          </mdui-fab>
        )}
      </div>
    </div>
  );
}

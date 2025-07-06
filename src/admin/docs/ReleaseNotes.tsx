import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "../../firebase";

import React from "react";
import Markdown from "react-markdown";
import { useLoaderData, useNavigate } from "react-router-dom";

export default function ReleaseNotes() {
  const { releaseNotes } = useLoaderData() as {
    releaseNotes: { content: string; updated?: Timestamp; updatedBy?: string };
  };

  const navigate = useNavigate();

  return (
    <div className="mdui-prose">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "start",
        }}
      >
        <div />
        <h1>Neuigkeiten 🎉</h1>
        <mdui-button-icon onClick={() => navigate("edit")} icon="edit" />
      </div>
      <Markdown className="help">{releaseNotes.content}</Markdown>
      <p />
      <i
        style={{
          display: "block",
          textAlign: "right",
          fontSize: "0.8em",
        }}
      >
        zuletzt aktualisiert am{" "}
        {releaseNotes.updated
          ? new Date(releaseNotes.updated.seconds * 1000).toLocaleString(
              "de-DE",
              {
                dateStyle: "medium",
              }
            )
          : "-"}{" "}
        von {releaseNotes.updatedBy || "-"}
      </i>
    </div>
  );
}
ReleaseNotes.loader = async function loader() {
  try {
    const releaseNotesData = await getDoc(doc(db, "docs", "release-notes"));
    if (!releaseNotesData.exists()) {
      throw new Error("Release notes not found");
    }
    const data = releaseNotesData.data();
    if (!data?.content) {
      throw new Error("Invalid release notes format");
    }
    return { releaseNotes: data };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Response("Daten konnten nicht geladen werden", {
      status: errorMessage === "Release notes not found" ? 404 : 500,
      statusText: errorMessage,
    });
  }
};

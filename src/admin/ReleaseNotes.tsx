import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

import React from "react";
import Markdown from "react-markdown";
import { Link, useLoaderData, useNavigate } from "react-router-dom";

export default function ReleaseNotes() {
  const { releaseNotes } = useLoaderData() as {
    releaseNotes: { content: string };
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
      <mdui-divider />
      <p />
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Link style={{ color: "white", fontSize: "12px" }} to="edit">
          Bearbeiten
        </Link>
      </div>
    </div>
  );
}
ReleaseNotes.loader = async function loader() {
  try {
    const releaseNotesData = await getDoc(doc(db, "docs", "release-notes"));
    if (!releaseNotesData.exists()) {
      throw new Error('Release notes not found');
    }
    const data = releaseNotesData.data();
    if (!data?.content) {
      throw new Error('Invalid release notes format');
    }
    return { releaseNotes: data };
  } catch (error) {
    throw new Response("Daten konnten nicht geladen werden", {
      status: error.message === "Release notes not found" ? 404 : 500,
      statusText: error.message,
    });
  }
};

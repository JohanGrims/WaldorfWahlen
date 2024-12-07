import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

import React from "react";
import Markdown from "react-markdown";
import { useLoaderData } from "react-router-dom";

export default function ReleaseNotes() {
  const { releaseNotes } = useLoaderData() as {
    releaseNotes: { content: string };
  };
  return (
    <div className="mdui-prose">
      <h1>Neuigkeiten 🎉</h1>
      <Markdown className="help">{releaseNotes.content}</Markdown>
    </div>
  );
}
ReleaseNotes.loader = async function loader() {
  const releaseNotesData = await getDoc(doc(db, "docs", "release-notes")); // Get release notes securely from Firestore (only accessible to admins)
  return { releaseNotes: releaseNotesData.data() };
};

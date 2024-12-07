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
    throw new Response('Failed to load release notes', { 
      status: error.message === 'Release notes not found' ? 404 : 500,
      statusText: error.message 
    });
  }
};

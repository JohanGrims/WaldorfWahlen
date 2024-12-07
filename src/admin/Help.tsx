import { doc, getDoc } from "firebase/firestore";
import React from "react";
import Markdown from "react-markdown";
import { useLoaderData } from "react-router-dom";
import { db } from "../firebase";

export default function Help() {
  const { helpContent } = useLoaderData() as {
    helpContent: { content: string };
  };

  return (
    <div className="mdui-prose">
      <h1>Hilfe & Kontakt</h1>
      <Markdown className="help">{helpContent.content}</Markdown>
    </div>
  );
}

Help.loader = async function loader() {
  const helpContent = await getDoc(doc(db, "docs", "help")); // Get contact information securely from Firestore (only accessible to admins)
  return { helpContent: helpContent.data() };
};

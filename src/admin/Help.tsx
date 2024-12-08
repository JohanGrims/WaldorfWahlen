import { doc, getDoc } from "firebase/firestore";
import React from "react";
import Markdown from "react-markdown";
import { Link, useLoaderData, useNavigate } from "react-router-dom";
import { db } from "../firebase";

export default function Help() {
  const { helpContent } = useLoaderData() as {
    helpContent: { content: string };
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
        <h1>Hilfe & Kontakt</h1>
        <mdui-button-icon onClick={() => navigate("edit")} icon="edit" />
      </div>
      <Markdown className="help">{helpContent.content}</Markdown>
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

Help.loader = async function loader() {
  const helpContent = await getDoc(doc(db, "docs", "help")); // Get contact information securely from Firestore (only accessible to admins)
  return { helpContent: helpContent.data() };
};

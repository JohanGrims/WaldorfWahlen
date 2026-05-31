import { collection, getDocs } from "firebase/firestore";
import React from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import { db } from "../../firebase";

interface V2VoteData {
  id: string;
  title: string;
  startTime: any;
  endTime: any;
  active: boolean;
}

export default function V2Overview() {
  const { votes } = useLoaderData() as { votes: V2VoteData[] };
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <h2>Übersicht</h2>
        <mdui-button icon="add" onClick={() => navigate("/v2/admin/new")}>Neue Wahl erstellen</mdui-button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
        {votes.map(vote => (
          <mdui-card
            key={vote.id}
            clickable
            variant="filled"
            style={{ padding: 24 }}
            onClick={() => navigate(`/v2/admin/${vote.id}/manage`)}
          >
            <h3>{vote.title}</h3>
            <div style={{ color: "var(--mdui-color-on-surface-variant)", marginTop: 8 }}>
              {new Date(vote.startTime.seconds * 1000).toLocaleDateString("de-DE")} - {new Date(vote.endTime.seconds * 1000).toLocaleDateString("de-DE")}
            </div>
            <div style={{ marginTop: 16 }}>
              <mdui-icon name="manage_accounts" style={{ marginRight: 8 }}></mdui-icon>
              Ergebnisse & Zuordnung
            </div>
          </mdui-card>
        ))}
        {votes.length === 0 && (
          <div style={{ color: "var(--mdui-color-on-surface-variant)" }}>
            Bisher keine Wahlen im neuen V2 System angelegt.
          </div>
        )}
      </div>
    </div>
  );
}

V2Overview.loader = async function loader() {
  // Assuming v2 votes are stored in a new collection "schools/SCHOOLID/v2_votes"
  const snap = await getDocs(collection(db, "schools/SCHOOLID/v2_votes"));
  return {
    votes: snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  };
};

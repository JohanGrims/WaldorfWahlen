import ListVotes from "./ListVotes";
import NewVote from "./NewVote";

import { useEffect } from "react";

export default function Overview() {
  useEffect(() => {
    document.title = "Admin - Übersicht";
  }, []);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-evenly",
        width: "90vw",
        boxSizing: "border-box",
        maxWidth: "90vw",
        overflowX: "hidden",
      }}
    >
      <div style={{ width: "60%", padding: 30 }}>
        <NewVote />
      </div>
      <div style={{ maxWidth: "20%" }}>
        <ListVotes />
      </div>
    </div>
  );
}

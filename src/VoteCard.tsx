import React from "react";
import { useNavigate } from "react-router";

// Placeholder for mdui-card or similar if it's not a standard HTML element.
// If mdui-card is a custom element, ensure it's used correctly.
// For navigation, ideally use Link from react-router-dom if appropriate,
// otherwise a simple href.

import { Timestamp } from "firebase/firestore";

interface VoteCardProps {
  id: string;
  title: string;
  endTime: Timestamp;
}

const VoteCard = ({ id, title, endTime }: VoteCardProps) => {
  const endTimeDE = new Date(endTime.seconds * 1000).toLocaleDateString(
    "de-DE",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  const navigate = useNavigate();
  return (
    <mdui-card
      clickable
      variant="elevated"
      style={{
        margin: "0",
        marginBottom: "16px",
        padding: "16px",
        minWidth: "280px",
        width: "100%",
        maxWidth: "320px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        flexGrow: 1, // Allow card to grow if space available
        textDecoration: "none",
      }}
      onClick={() => {
        navigate(`/${id}`);
      }}
    >
      <div>
        <h3 style={{ marginTop: "0", marginBottom: "8px", fontSize: "1.25em" }}>
          {title}
        </h3>
        <p style={{ fontSize: "0.9em", color: "#555" }}>Endet am {endTimeDE}</p>
      </div>
    </mdui-card>
  );
};

export default VoteCard;

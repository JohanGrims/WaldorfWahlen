import React from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import { Timestamp, DocumentData } from "firebase/firestore";
import { formatBerlinTimestamp } from "./utils/date";

interface VoteData extends DocumentData {
  startTime: Timestamp;
  endTime: Timestamp;
}

interface LoaderData {
  vote: VoteData;
}

export default function Scheduled() {
  const { vote } = useLoaderData() as LoaderData;

  const navigate = useNavigate();

  return (
    <mdui-dialog open headline="Geplante Wahl" icon="schedule">
      <div className="mdui-prose">
        <p>Diese Wahl ist noch nicht aktiv.</p>
        <p>
          Die Wahl wird am{" "}
          {formatBerlinTimestamp(vote.startTime.seconds, "dd.MM.yyyy HH:mm")}{" "}
          starten und am{" "}
          {formatBerlinTimestamp(vote.endTime.seconds, "dd.MM.yyyy HH:mm")}{" "}
          enden.
        </p>
      </div>
      <p />
      <div className="button-container">
        <mdui-button onClick={() => navigate("/")} variant="text" icon="home">
          Startseite
        </mdui-button>
      </div>
    </mdui-dialog>
  );
}

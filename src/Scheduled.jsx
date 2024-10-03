import moment from "moment-timezone";
import React from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
export default function Scheduled() {
  const { vote } = useLoaderData();

  const navigate = useNavigate();

  return (
    <mdui-dialog open headline="Geplante Wahl">
      <div className="mdui-prose">
        <p>Diese Wahl ist noch nicht aktiv.</p>
        <p>
          Die Wahl wird am{" "}
          {moment
            .tz(vote.startTime.seconds * 1000, "Europe/Berlin")
            .format("DD.MM.YYYY HH:mm")}{" "}
          starten und am{" "}
          {moment
            .tz(vote.endTime.seconds * 1000, "Europe/Berlin")
            .format("DD.MM.YYYY HH:mm")}{" "}
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

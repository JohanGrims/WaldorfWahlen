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
          {new Date(vote.startTime.seconds * 1000).toLocaleString([], {
            hour: "2-digit",
            minute: "2-digit",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })}{" "}
          starten und am{" "}
          {new Date(vote.endTime.seconds * 1000).toLocaleString([], {
            hour: "2-digit",
            minute: "2-digit",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })}{" "}
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

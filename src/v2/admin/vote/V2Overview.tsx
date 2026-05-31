import React from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import { formatBerlinDate } from "../../../utils/date";
import { V2LoaderData } from "./V2Layout";
import { getDocs, collection } from "firebase/firestore";
import { db } from "../../../firebase";

export default function V2Overview() {
  const { vote, choices, options } = useLoaderData() as V2LoaderData;
  const navigate = useNavigate();
  const mobile: boolean = window.innerWidth < 840;

  // We need to fetch proposals manually because they are not loaded in V2Layout's loader yet
  const [proposalsCount, setProposalsCount] = React.useState<number>(0);

  React.useEffect(() => {
    async function loadProposals() {
      if (vote.proposals) {
        const props = await getDocs(collection(db, `schools/SCHOOLID/v2_votes/${vote.id}/proposals`));
        
        // Filter out those that are already options
        const pendingCount = props.docs.filter(
          (proposal) =>
            !options.some(
              (option) => option.id === proposal.id || option.title === proposal.data().name
            )
        ).length;
        setProposalsCount(pendingCount);
      }
    }
    loadProposals();
  }, [vote.id, vote.proposals, options]);

  return (
    <div className="mdui-prose">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ margin: 0 }}>{vote.title}</h2>
      </div>
      <p />
      {proposalsCount > 0 && (
        <mdui-card
          variant="filled"
          style={{ padding: "20px", marginBottom: "20px", width: "100%" }}
          clickable
          onClick={() => navigate(`edit`)}
        >
          <h3>{proposalsCount} Vorschläge für Optionen</h3>
        </mdui-card>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <div>
          <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Vorbereitung</h3>
          <mdui-list>
            <mdui-list-item
              headline="Zeitplan ändern"
              description="Start- und Endzeitpunkt der Wahl anpassen"
              icon="schedule"
              onClick={() => navigate(`schedule`)}
              rounded
            >
              <mdui-chip slot="end-icon" style={{ pointerEvents: "none" }}>
                {!vote.active
                  ? "Nicht aktiv"
                  : `${formatBerlinDate(
                      vote.startTime.toDate(),
                      "dd.MM. HH:mm"
                    )} bis ${formatBerlinDate(
                      vote.endTime.toDate(),
                      "dd.MM. HH:mm"
                    )}`}
              </mdui-chip>
            </mdui-list-item>
            <mdui-list-item
              headline="Wahl & Optionen"
              description="Den Namen der Wahl, Beschreibung und die zu wählenden Projekte verwalten"
              icon="edit"
              onClick={() => navigate(`edit`)}
              rounded
            >
              <mdui-badge slot="end-icon">{options.length}</mdui-badge>
            </mdui-list-item>
            <mdui-list-item
              headline="Vorschau"
              description="Die Wahl aus der Sicht einer Schülerin betrachten"
              icon="visibility"
              onClick={() =>
                window.open(`/v2/vote/${vote.id}?preview=true`, "_blank")
              }
              rounded
            ></mdui-list-item>
          </mdui-list>
        </div>

        <div>
          <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Durchführung</h3>
          <mdui-list>
            <mdui-list-item
              headline="Antworten"
              description="Eingegangene Wahlen der SchülerInnen einsehen"
              icon="people"
              onClick={() => navigate(`answers`)}
              rounded
            >
              <mdui-badge slot="end-icon">{choices.length}</mdui-badge>
            </mdui-list-item>
            <mdui-list-item
              headline="E-Mail Links versenden"
              description="Personalisierte Zero-PII Voting-Links via E-Mail an Teilnehmer senden"
              icon="forward_to_inbox"
              onClick={() => navigate(`email`)}
              rounded
            ></mdui-list-item>
          </mdui-list>
        </div>

        <div>
          <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Auswertung</h3>
          <mdui-list>
            <mdui-list-item
              headline="Zuteilen"
              description="SchülerInnen automatisch den Projekten zuordnen"
              icon="auto_awesome"
              onClick={() => navigate(`assign`)}
              rounded
            ></mdui-list-item>
            <mdui-list-item
              headline="Ergebnisse & PDF"
              description="Die finalen Ergebnisse einsehen, drucken und veröffentlichen"
              icon="bar_chart"
              onClick={() => navigate(`results`)}
              rounded
            ></mdui-list-item>
            <mdui-list-item
              headline="Exportieren (Excel)"
              description="Die entschlüsselten Ergebnisse und Zuteilungen lokal als Excel-Dateien exportieren"
              icon="downloading"
              onClick={() => navigate(`exports`)}
              rounded
            ></mdui-list-item>
          </mdui-list>
        </div>
      </div>
    </div>
  );
}

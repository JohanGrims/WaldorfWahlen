import { collection, doc, getDoc, getDocs, Timestamp, DocumentData } from "firebase/firestore";
import {
  LoaderFunctionArgs,
  useLoaderData,
  useNavigate,
} from "react-router-dom";
import { db } from "../../firebase";
import { act } from "react";

interface VoteData extends DocumentData {
  id: string;
  title: string;
  active: boolean;
  startTime: Timestamp;
  endTime: Timestamp;
}

interface ChoiceData extends DocumentData {
  id: string;
}

interface OptionData extends DocumentData {
  id: string;
  name: string;
  title: string;
}

interface ResultData extends DocumentData {
  id: string;
}

interface ProposalData extends DocumentData {
  id: string;
  name: string;
}

interface LoaderData {
  vote: VoteData;
  choices: ChoiceData[];
  options: OptionData[];
  results: ResultData[];
  proposals: ProposalData[];
}

export default function AdminVote() {
  const { vote, choices, options, proposals } = useLoaderData() as LoaderData;

  const mobile: boolean = window.innerWidth < 840;

  const navigate = useNavigate();

  const pendingProposals = proposals.filter(
    (proposal) =>
      !options.some(
        (option) => option.id === proposal.id || option.title === proposal.name
      )
  );

  return (
    <div className="mdui-prose">
      <div
        style={{
          display: mobile ? "block" : "flex",
          justifyContent: "space-between",
        }}
      >
        <h2>{vote.title}</h2>
        <mdui-chip onClick={() => navigate("./schedule")}>
          {!vote.active
            ? "Nicht aktiv"
            : `${new Date(vote.startTime.seconds * 1000).toLocaleString([], {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })} - ${new Date(vote.endTime.seconds * 1000).toLocaleString([], {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}`}
        </mdui-chip>
      </div>
      <p />
      {pendingProposals.length > 0 && (
        <mdui-card
          variant="filled"
          style={{ padding: "20px", marginBottom: "20px", width: "100%" }}
          clickable
          onClick={() => navigate(`/admin/${vote.id}/edit`)}
        >
          <h3>{pendingProposals.length} Vorschläge für Optionen</h3>
        </mdui-card>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <div>
          <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Vorbereitung</h3>
          <mdui-list>
            <mdui-list-item
              headline="Optionen"
              description="Die Wahl und die Projekte verwalten"
              icon="edit"
              onClick={() => navigate(`/admin/${vote.id}/edit`)}
              rounded
            >
              <mdui-badge slot="end-icon">{options.length}</mdui-badge>
            </mdui-list-item>
            <mdui-list-item
              headline="Teilen"
              description="Einladungslinks für SchülerInnen generieren"
              icon="share"
              onClick={() => navigate(`/admin/${vote.id}/share`)}
              rounded
            ></mdui-list-item>
            <mdui-list-item
              headline="Vorschau"
              description="Die Wahl aus der Sicht einer Schülerin betrachten"
              icon="visibility"
              onClick={() =>
                window.open(`/v/${vote.id}?preview=true`, "_blank")
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
              onClick={() => navigate(`/admin/${vote.id}/answers`)}
              rounded
            >
              <mdui-badge slot="end-icon">{choices.length}</mdui-badge>
            </mdui-list-item>
            <mdui-list-item
              headline="E-Mail"
              description="Erinnerungen oder Informationen an Teilnehmer senden"
              icon="forward_to_inbox"
              onClick={() => navigate(`/admin/${vote.id}/email`)}
              rounded
            ></mdui-list-item>
            <mdui-list-item
              headline="Teilnehmer hinzufügen"
              description="SchülerInnen manuell zur Wahl hinzufügen"
              icon="person_add"
              onClick={() => navigate(`/admin/${vote.id}/add`)}
              rounded
            ></mdui-list-item>
          </mdui-list>
        </div>

        <div>
          <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Auswertung</h3>
          <mdui-list>
            <mdui-list-item
              headline="Abgleichen"
              description="SchülerInnen mit Klassenlisten abgleichen"
              icon="fact_check"
              onClick={() => navigate(`/admin/${vote.id}/match`)}
              rounded
            ></mdui-list-item>
            <mdui-list-item
              headline="Zuteilen"
              description="SchülerInnen (automatisch) den Projekten zuordnen"
              icon="auto_awesome"
              onClick={() => navigate(`/admin/${vote.id}/assign`)}
              rounded
            ></mdui-list-item>
            <mdui-list-item
              headline="Ergebnisse"
              description="Die finalen Ergebnisse einsehen und veröffentlichen"
              icon="bar_chart"
              onClick={() => navigate(`/admin/${vote.id}/results`)}
              rounded
            ></mdui-list-item>
            <mdui-list-item
              headline="Statistiken"
              description="Detaillierte Statistiken und Analysen der Wahl"
              icon="trending_up"
              onClick={() => navigate(`/admin/${vote.id}/stats`)}
              rounded
            ></mdui-list-item>
          </mdui-list>
        </div>

        <div>
          <h3
            style={{
              marginTop: 0,
              marginBottom: "1rem",
              color: "var(--mdui-color-error)",
            }}
          >
            Gefahrenzone
          </h3>
          <mdui-list>
            <mdui-list-item
              headline="Löschen"
              description="Diese Wahl vom Dashboard löschen"
              icon="delete"
              onClick={() => navigate(`/admin/${vote.id}/delete`)}
              rounded
            ></mdui-list-item>
          </mdui-list>
        </div>
      </div>
    </div>
  );
}

AdminVote.loader = async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params as { id: string };
  const vote = await getDoc(doc(db, `/votes/${id}`));
  if (!vote.exists()) {
    throw new Response("Seite nicht gefunden", { status: 404 });
  }
  const voteData = { id: vote.id, ...vote.data() } as VoteData;

  const choices = await getDocs(collection(db, `/votes/${id}/choices`));
  const choiceData = choices.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ChoiceData[];

  const options = await getDocs(collection(db, `/votes/${id}/options`));
  const optionData = options.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as OptionData[];

  const results = await getDocs(collection(db, `/votes/${id}/results`));
  const resultData = results.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ResultData[];

  const proposals = await getDocs(collection(db, `/votes/${id}/proposals`));
  const proposalData = proposals.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ProposalData[];
  return {
    vote: voteData,
    choices: choiceData,
    options: optionData,
    results: resultData,
    proposals: proposalData,
  };
};

import { collection, doc, getDoc, getDocs, Timestamp, DocumentData } from "firebase/firestore";
import { useLoaderData, useNavigate } from "react-router-dom";
import { db } from "../../firebase";

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
      <div
        style={{
          display: "grid",
          gap: "20px",
          gridTemplateColumns: mobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr",
        }}
      >
        <mdui-card
          variant="filled"
          style={{ padding: "20px", flex: 1 }}
          clickable
          onClick={() => navigate(`/admin/${vote.id}/edit`)}
        >
          <h3>Optionen</h3>
          <p>
            <span style={{ fontSize: "50px" }}>{options.length}</span>
          </p>
        </mdui-card>
        <mdui-card
          variant="filled"
          style={{ padding: "20px", flex: 1 }}
          clickable
          onClick={() => navigate(`/admin/${vote.id}/answers`)}
        >
          <h3>Antworten</h3>
          <p>
            <span style={{ fontSize: "50px" }}>{choices.length}</span>
          </p>
        </mdui-card>
        <mdui-card
          variant="filled"
          style={{ padding: "20px", flex: 1 }}
          clickable
          onClick={() => navigate(`/admin/${vote.id}/email`)}
        >
          <h3>E-Mail</h3>
          <p>
            <span style={{ fontSize: "50px" }}>
              <mdui-icon name="forward_to_inbox" style={{ fontSize: "50px" }} />
            </span>
          </p>
        </mdui-card>
        <mdui-card
          variant="filled"
          style={{ padding: "20px", flex: 1 }}
          clickable
          onClick={() => navigate(`/admin/${vote.id}/match`)}
        >
          <h3>Abgleichen</h3>
          <p style={{ fontSize: "50px" }}>
            <mdui-icon name={"fact_check"} style={{ fontSize: "50px" }} />
          </p>
        </mdui-card>
        <mdui-card
          variant="filled"
          style={{ padding: "20px", flex: 1 }}
          clickable
          onClick={() => navigate(`/admin/${vote.id}/assign`)}
        >
          <h3>Zuteilen</h3>
          <p>
            <span style={{ fontSize: "50px" }}>
              <mdui-icon name="auto_awesome" style={{ fontSize: "50px" }} />
            </span>
          </p>
        </mdui-card>
        <mdui-card
          variant="filled"
          style={{ padding: "20px", flex: 1 }}
          clickable
          onClick={() => navigate(`/admin/${vote.id}/results`)}
        >
          <h3>Ergebnisse</h3>
          <p>
            <span style={{ fontSize: "50px" }}>
              <mdui-icon name="bar_chart" style={{ fontSize: "50px" }} />
            </span>
          </p>
        </mdui-card>
        <mdui-card
          variant="filled"
          style={{ padding: "20px", flex: 1 }}
          clickable
          onClick={() => navigate(`/admin/${vote.id}/share`)}
        >
          <h3>Teilen</h3>
          <p>
            <span style={{ fontSize: "50px" }}>
              <mdui-icon name="share" style={{ fontSize: "50px" }} />
            </span>
          </p>
        </mdui-card>
        <mdui-card
          variant="filled"
          style={{ padding: "20px", flex: 1 }}
          clickable
          onClick={() => navigate(`/admin/${vote.id}/delete`)}
        >
          <h3>Löschen</h3>
          <p>
            <span style={{ fontSize: "50px" }}>
              <mdui-icon name="delete" style={{ fontSize: "50px" }} />
            </span>
          </p>
        </mdui-card>
      </div>
    </div>
  );
}

AdminVote.loader = async function loader({ params }) {
  const { id } = params as { id: string };
  const vote = await getDoc(doc(db, `/votes/${id}`));
  if (!vote.exists()) {
    throw new Response("Seite nicht gefunden", { status: 404 });
  }
  const voteData = { id: vote.id, ...vote.data() } as VoteData;

  const choices = await getDocs(collection(db, `/votes/${id}/choices`));
  const choiceData = choices.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ChoiceData[];

  const options = await getDocs(collection(db, `/votes/${id}/options`));
  const optionData = options.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as OptionData[];

  const results = await getDocs(collection(db, `/votes/${id}/results`));
  const resultData = results.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ResultData[];

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

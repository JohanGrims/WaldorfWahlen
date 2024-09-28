import { collection, doc, getDoc, getDocs } from "firebase/firestore/lite";
import { useLoaderData, useNavigate } from "react-router-dom";
import { db } from "../../firebase";

export default function AdminVote() {
  const { vote, choices, options, results } = useLoaderData();

  const navigate = useNavigate();

  return (
    <div className="mdui-prose">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>{vote.title}</h2>
        <mdui-tooltip
          variant="rich"
          headline="Status"
          content={`Diese Wahl ist ${
            vote.active && vote.endTime.seconds * 1000 > Date.now()
              ? vote.startTime.seconds * 1000 < Date.now()
                ? "aktiv"
                : "geplant"
              : "beendet"
          }.`}
        >
          <mdui-icon
            name={
              vote.active && vote.endTime.seconds * 1000 > Date.now()
                ? vote.startTime.seconds * 1000 < Date.now()
                  ? "event_available"
                  : "event"
                : "done_all"
            }
          ></mdui-icon>
        </mdui-tooltip>
      </div>
      <p />
      <div
        style={{ display: "flex", gap: "20px", justifyContent: "space-around" }}
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
          onClick={() => navigate(`/admin/${vote.id}/export`)}
        >
          <h3>Export</h3>
          <p>
            <span style={{ fontSize: "50px" }}>
              <mdui-icon name="upgrade" style={{ fontSize: "50px" }} />
            </span>
          </p>
        </mdui-card>
      </div>
      <p />
      <div
        style={{ display: "flex", gap: "20px", justifyContent: "space-around" }}
      >
        <mdui-card
          variant="filled"
          style={{ padding: "20px", flex: 1 }}
          clickable
          onClick={() => navigate(`/admin/${vote.id}/schedule`)}
        >
          <h3>
            {vote.active && vote.endTime.seconds * 1000 > Date.now()
              ? vote.startTime.seconds * 1000 < Date.now()
                ? "Beenden"
                : "Planen"
              : "Starten"}
          </h3>
          <p style={{ fontSize: "50px" }}>
            <mdui-icon
              name={
                vote.active && vote.endTime.seconds * 1000 > Date.now()
                  ? vote.startTime.seconds * 1000 < Date.now()
                    ? "pause"
                    : "scheduled"
                  : "play_arrow"
              }
              style={{ fontSize: "50px" }}
            />
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
          onClick={() => navigate(`/v/${vote.id}?preview=true`)}
        >
          <h3>Vorschau</h3>
          <p>
            <span style={{ fontSize: "50px" }}>
              <mdui-icon name="visibility" style={{ fontSize: "50px" }} />
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

export async function loader({ params }) {
  const { id } = params;
  const vote = await getDoc(doc(db, `/votes/${id}`));
  if (!vote.exists()) {
    throw new Response("Vote not found", { status: 404 });
  }
  const voteData = { id: vote.id, ...vote.data() };

  const choices = await getDocs(collection(db, `/votes/${id}/choices`));
  const choiceData = choices.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const options = await getDocs(collection(db, `/votes/${id}/options`));
  const optionData = options.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const results = await getDocs(collection(db, `/votes/${id}/results`));
  const resultData = results.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return {
    vote: voteData,
    choices: choiceData,
    options: optionData,
    results: resultData,
  };
}
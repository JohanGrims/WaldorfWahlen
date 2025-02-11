import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { useLoaderData, useNavigate } from "react-router-dom";
import { db } from "../../firebase";

/**
 * Renders the admin interface for a vote, displaying vote details and various administrative actions.
 *
 * This component retrieves vote-related data (vote, choices, options, and results) via the `useLoaderData`
 * hook, and adjusts its layout responsively based on the window's inner width. It displays the vote title,
 * scheduling information (formatted for active votes), and a series of clickable cards that navigate to
 * different admin functionalities:
 * - Editing options
 * - Viewing answers
 * - Sharing the vote
 * - Adding options
 * - Matching data
 * - Assigning tasks
 * - Previewing the vote
 * - Deleting the vote
 *
 * Navigation is managed by the `useNavigate` hook from React Router.
 *
 * @component
 * @example
 * // In your route configuration (e.g., using React Router):
 * <Route path="/admin/:id" element={<AdminVote />} />
 *
 * @returns {JSX.Element} The rendered admin voting interface.
 */
export default function AdminVote() {
  const { vote, choices, options, results } = useLoaderData();

  const mobile = window.innerWidth < 840;

  const navigate = useNavigate();

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
          onClick={() => navigate(`/admin/${vote.id}/add`)}
        >
          <h3>Hinzufügen</h3>
          <p>
            <span style={{ fontSize: "50px" }}>
              <mdui-icon name="add" style={{ fontSize: "50px" }} />
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

AdminVote.loader = async function loader({ params }) {
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
};

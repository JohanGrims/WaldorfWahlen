import { collection, getDocs } from "firebase/firestore";
import moment from "moment-timezone";
import { useLoaderData, useNavigate } from "react-router-dom";
import { db } from "../firebase";
/**
 * Renders the Overview dashboard for managing voting sessions and student data.
 *
 * This React component retrieves vote data via the `useLoaderData` hook, expecting an object
 * that contains a `votes` array. Each vote object should include properties such as:
 * - `startTime` (an object with a `seconds` property) indicating when the vote starts,
 * - `endTime` (an object with a `seconds` property) indicating when the vote ends,
 * - `active` (a boolean indicating if the vote is currently active),
 * - `title` (a string representing the vote's title), and
 * - `id` (a unique identifier).
 *
 * The component displays:
 * - A grid card for managing student data (navigates to "/admin/students/new-class"),
 * - A grid card for exporting results (navigates to "/admin/exports"),
 * - A list of voting session cards sorted in descending order by `startTime`.
 *   Each session card evaluates the current time against `startTime` and `endTime` to determine
 *   if the vote is active (shows an "event_available" icon), planned (shows a "schedule" icon),
 *   or completed (shows a "done_all" icon) and navigates to a detailed view ("/admin/{vote.id}").
 * - A grid card to create a new vote (navigates to "/admin/new").
 *
 * The component makes extensive use of inline styling to ensure a responsive grid layout,
 * adapting to various screen sizes via CSS grid properties.
 *
 * @returns {JSX.Element} The rendered Overview component.
 */
export default function Overview() {
  const { votes } = useLoaderData();

  const navigate = useNavigate();

  return (
    <div className="mdui-prose" style={{ width: "100%" }}>
      <h2>Übersicht</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px",
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <mdui-card
          variant="outlined"
          style={{
            width: "100%",
            padding: "20px",
            boxSizing: "border-box",
          }}
          clickable
          onClick={() => navigate("/admin/students/new-class")}
        >
          <div
            className="mdui-prose"
            style={{ width: "100%", userSelect: "none" }}
          >
            <div
              style={{
                display: "flex",
                textWrap: "nowrap",
                gap: "10px",
              }}
            >
              <h2>SchülerInnen</h2>
              <mdui-icon name="groups"></mdui-icon>
            </div>
            Verwalten Sie die Datenbank der SchülerInnen, fügen Sie neue
            SchülerInnen hinzu und bearbeiten Sie bestehende Klassenlisten.
          </div>
        </mdui-card>
        <mdui-card
          variant="outlined"
          style={{
            width: "100%",
            padding: "20px",
            boxSizing: "border-box",
          }}
          clickable
          onClick={() => navigate("/admin/exports")}
        >
          <div
            className="mdui-prose"
            style={{ width: "100%", userSelect: "none" }}
          >
            <div
              style={{
                display: "flex",
                textWrap: "nowrap",
                gap: "10px",
              }}
            >
              <h2>Exportieren</h2>
              <mdui-icon name="downloading"></mdui-icon>
            </div>
            Wählen mehrere Sie Wahlen aus, deren Ergebnisse Sie in verschiedenen
            Formaten herunterladen können.
          </div>
        </mdui-card>
      </div>
      <p />
      <br />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px",
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {votes
          .sort((a, b) => {
            return b.startTime.seconds - a.startTime.seconds;
          })
          .map((vote) => {
            const now = moment();
            const startTime = moment.unix(vote.startTime.seconds);
            const endTime = moment.unix(vote.endTime.seconds);
            const isActive =
              vote.active && endTime.isAfter(now) && startTime.isBefore(now);

            const isPlanned = startTime.isAfter(now);

            return (
              <mdui-card
                key={vote.id}
                variant="filled"
                style={{ padding: "20px", width: "100%" }}
                clickable
                onClick={() => navigate(`/admin/${vote.id}`)}
              >
                <h3>{vote.title}</h3>
                <p>
                  <mdui-icon
                    style={{ fontSize: "50px" }}
                    name={
                      isActive
                        ? "event_available"
                        : isPlanned
                        ? "schedule"
                        : "done_all"
                    }
                  ></mdui-icon>
                </p>
              </mdui-card>
            );
          })}
        <mdui-card
          variant="outlined"
          style={{ padding: "20px", width: "100%" }}
          clickable
          onClick={() => navigate("/admin/new")}
        >
          <h2>Neue Wahl</h2>
          <p>
            <mdui-icon name="create" style={{ fontSize: "50px" }}></mdui-icon>
          </p>
        </mdui-card>
      </div>
    </div>
  );
}

Overview.loader = async function loader() {
  const votes = await getDocs(collection(db, "votes"));
  return {
    votes: votes.docs.map((e) => {
      return { id: e.id, ...e.data() };
    }),
  };
};

import { collection, getDocs } from "firebase/firestore/lite";
import moment from "moment-timezone";
import { useLoaderData, useNavigate } from "react-router-dom";
import { db } from "../firebase";
export default function Overview() {
  const { votes } = useLoaderData();

  const navigate = useNavigate();

  return (
    <div className="mdui-prose">
      <h2>Übersicht</h2>
      <p />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "20px",
        }}
      >
        {votes.map((vote) => {
          const now = moment();
          const startTime = moment.unix(vote.startTime.seconds);
          const endTime = moment.unix(vote.endTime.seconds);
          const isActive =
            vote.active && endTime.isAfter(now) && startTime.isBefore(now);

          return (
            <mdui-card
              key={vote.id}
              variant="filled"
              style={{ padding: "20px" }}
              clickable
              onClick={() => navigate(`/admin/${vote.id}`)}
            >
              <h3>{vote.title}</h3>
              <p>
                <mdui-icon
                  style={{ fontSize: "50px" }}
                  name={isActive ? "event_available" : "done_all"}
                ></mdui-icon>
              </p>
            </mdui-card>
          );
        })}
        <mdui-card
          variant="outlined"
          style={{ padding: "20px" }}
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

export async function loader() {
  const votes = await getDocs(collection(db, "votes"));
  return {
    votes: votes.docs.map((e) => {
      return { id: e.id, ...e.data() };
    }),
  };
}

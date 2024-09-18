import { collection, getDocs } from "firebase/firestore/lite";
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
        {votes.map((vote) => (
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
                name={
                  vote.active && vote.endTime.seconds * 1000 > Date.now()
                    ? vote.startTime.seconds * 1000 < Date.now()
                      ? "event_available"
                      : "event"
                    : "done_all"
                }
              ></mdui-icon>
            </p>
          </mdui-card>
        ))}
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

import { collection, getDocs } from "firebase/firestore";
import moment from "moment-timezone";
import { useLoaderData, useNavigate } from "react-router-dom";
import { db } from "../firebase";
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

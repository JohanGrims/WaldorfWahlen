import { collection, getDocs, Timestamp } from "firebase/firestore";
import { redirect, useLoaderData, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import React from "react";
interface VoteData {
  id: string;
  title: string;
  startTime: Timestamp;
  endTime: Timestamp;
  active: boolean;
}

interface LoaderData {
  votes: VoteData[];
}

export default function Overview() {
  const { votes } = useLoaderData() as LoaderData;

  const navigate = useNavigate();

  const [isAdmin, setIsAdmin] = React.useState(() => {
    return localStorage.getItem("superadminMode") === "true";
  });

  React.useEffect(() => {
    if (isAdmin) {
      navigate("/admin/power", { replace: true });
    }

    auth.currentUser?.getIdTokenResult().then((idTokenResult) => {
      const claims = idTokenResult.claims;
      if (claims.role === "admin") {
        localStorage.setItem("superadminMode", "true");
        setIsAdmin(true);
        navigate("/admin/power", { replace: true });
      } else {
        localStorage.setItem("superadminMode", "false");
      }
    });
  }, [isAdmin, navigate]);

  if (isAdmin) {
    return (
      <div style={{ width: "100%", padding: "2rem" }}>
        <mdui-linear-progress></mdui-linear-progress>
      </div>
    );
  }

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
            const now = Date.now();
            const startTimeMs = vote.startTime.seconds * 1000;
            const endTimeMs = vote.endTime.seconds * 1000;
            const isActive =
              vote.active && endTimeMs > now && startTimeMs < now;

            const isPlanned = startTimeMs > now;

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
  const votes = await getDocs(collection(db, "schools/SCHOOLID/votes"));
  return {
    votes: votes.docs.map((e) => {
      return { id: e.id, ...e.data() } as VoteData;
    }),
  };
};

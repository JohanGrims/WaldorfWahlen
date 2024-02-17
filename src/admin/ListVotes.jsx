import { collection, getDocs } from "firebase/firestore/lite";
import React from "react";
import { db } from "../firebase";

export default function ListVotes() {
  const [activeVotes, setActiveVotes] = React.useState([]);
  const [expiredVotes, setExpiredVotes] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getDocs(collection(db, "/votes")).then((data) => {
      data.docs.map((e) => {
        let data = e.data();
        if (data.active) {
          setActiveVotes((activeVotes) => [
            ...activeVotes,
            { id: e.id, title: data.title },
          ]);
        } else {
          setExpiredVotes((expiredVotes) => [
            ...expiredVotes,
            { id: e.id, title: data.title },
          ]);
        }
      });
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div style={{ width: "30vw" }} />;
  }

  return (
    <div style={{ width: "40vw" }}>
      <h2>Umfragen</h2>
      <h3>Aktiv</h3>

      {activeVotes.map((e) => (
        <>
          <a href={`/admin/${e.id}`} className="link">
            {e.title}
          </a>
          <p />
        </>
      ))}
      <h3>Beendet</h3>

      {expiredVotes.map((e) => (
        <>
          <a href={`/admin/${e.id}`} className="link">
            {e.title}
          </a>
          <p />
        </>
      ))}
    </div>
  );
}

import { collection, getDocs } from "firebase/firestore/lite";
import React from "react";
import "./App.css";
import { db } from "./firebase";
import logo from "/WSP.png";

function App() {
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

  return (
    <>
      <div>
        <a href="https://waldorfschule-potsdam.de" target="_blank">
          <img src={logo} className="logo" alt="Logo" />
        </a>
      </div>
      developed by <a href="https://github.com/johangrims">@JohanGrims</a>
      {!loading && (
        <>
          <h1>Wahlen</h1>
          <h3>Aktiv</h3>
          {activeVotes.map((e) => (
            <>
              <a href={`/v/${e.id}`} className="link">
                {e.title}
              </a>
              <p />
            </>
          ))}
          {activeVotes.length < 1 && "Keine aktiven Wahlen"}
          <h3>Beendet</h3>
          {expiredVotes.map((e) => (
            <>
              <a href={`/r/${e.id}`} className="link">
                {e.title}
              </a>
              <p />
            </>
          ))}
          {expiredVotes.length < 1 && "Keine beendeten Wahlen"}
        </>
      )}
    </>
  );
}

export default App;

import { collection, getDocs } from "firebase/firestore/lite";
import React from "react";
import { useLoaderData } from "react-router-dom";
import "./App.css";
import { db } from "./firebase";

function App() {
  const { activeVotes, expiredVotes } = useLoaderData();

  return (
    <div className="waldorf-vote-landing-page">
      <header className="waldorf-header">
        <div className="waldorf-logo-container">
          <img src={"/WSP.png"} className="waldorf-logo" alt="Logo" />
        </div>
        <h1>Wahlen</h1>
        <p className="waldorf-description">
          WaldorfWahlen ist eine Webanwendung, die es der Waldorfschule Potsdam
          ermöglicht, Projektwahlen für ihre Schülerinnen und Schüler
          durchzuführen. Die Anwendung basiert auf dem Vite-Framework in
          Verbindung mit ReactJS für das Frontend und Firebase für das Backend
          und die Datenbank.
        </p>
      </header>

      <main className="waldorf-main-content">
        <section className="waldorf-section">
          <h3 className="waldorf-section-title">Aktiv</h3>
          <div className="waldorf-vote-list">
            {activeVotes.map((vote) => (
              <div key={vote.id} className="waldorf-vote-card">
                <a href={`/v/${vote.id}`} className="waldorf-link">
                  {vote.title}
                </a>
              </div>
            ))}
            {activeVotes.length < 1 && (
              <div className="waldorf-no-votes">Keine aktiven Wahlen</div>
            )}
          </div>
        </section>

        <section className="waldorf-section">
          <h3 className="waldorf-section-title">Beendet</h3>
          <div className="waldorf-vote-list">
            {expiredVotes.map((vote) => (
              <div key={vote.id} className="waldorf-vote-card">
                <a href={`/r/${vote.id}`} className="waldorf-link">
                  {vote.title}
                </a>
              </div>
            ))}
            {expiredVotes.length < 1 && (
              <div className="waldorf-no-votes">Keine beendeten Wahlen</div>
            )}
          </div>
        </section>
      </main>

      <footer className="waldorf-footer">
        <span className="waldorf-credits">
          Developed by <a href="https://github.com/johangrims">@JohanGrims</a>
        </span>
      </footer>
    </div>
  );
}

export default App;

export async function loader() {
  const votes = await getDocs(collection(db, "/votes"));
  const activeVotes = [];
  const expiredVotes = [];
  votes.docs.map((e) => {
    let data = e.data();
    console.log(data, e.id);
    if (Date.now() > data.startTime.seconds * 1000) {
      if (data.active && Date.now() < data.endTime.seconds * 1000) {
        activeVotes.push({ id: e.id, title: data.title });
      } else {
        expiredVotes.push({ id: e.id, title: data.title });
      }
    }
  });
  return { activeVotes, expiredVotes };
}

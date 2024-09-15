import { collection, getDocs } from "firebase/firestore/lite";
import React from "react";
import { useLoaderData } from "react-router-dom";
import "./App.css";
import { db } from "./firebase";

function App() {
  const { activeVotes, expiredVotes, scheduledVotes } = useLoaderData();

  return (
    <div className="mdui-prose">
      <p />
      <div style={{ display: "flex", justifyContent: "center" }}>
        <img src="/WSP.png" alt="Logo" className="waldorf-logo" />
      </div>
      <p />
      <h1>WaldorfWahlen</h1>
      <mdui-list>
        {activeVotes.length < 1 && (
          <mdui-list-item disabled>Keine aktiven Wahlen</mdui-list-item>
        )}
        {activeVotes.map((vote) => (
          <mdui-list-item
            key={vote.id}
            href={`/v/${vote.id}`}
            rounded
            end-icon="arrow_forward"
          >
            {vote.title}
          </mdui-list-item>
        ))}
        <mdui-collapse>
          <mdui-collapse-item value="scheduled-votes">
            <mdui-list-item
              rounded
              icon="scheduled"
              end-icon="expand_more"
              slot="header"
            >
              <mdui-list-item-content>Geplante Wahlen</mdui-list-item-content>
            </mdui-list-item>
            <div style={{ padding: "0 1rem" }}>
              <>
                {scheduledVotes.length === 0 && (
                  <mdui-list-item disabled>Keine Wahlen</mdui-list-item>
                )}
                {scheduledVotes.map((e) => (
                  <mdui-list-item
                    rounded
                    href={`/v/${e.id}`}
                    end-icon="arrow_forward"
                  >
                    {e.title}
                  </mdui-list-item>
                ))}
              </>
            </div>
          </mdui-collapse-item>

          <mdui-collapse-item value="expired-votes">
            <mdui-list-item
              rounded
              icon="history"
              end-icon="expand_more"
              slot="header"
            >
              <mdui-list-item-content>Beendete Wahlen</mdui-list-item-content>
            </mdui-list-item>
            <div style={{ padding: "0 1rem" }}>
              <>
                {expiredVotes.length === 0 && (
                  <mdui-list-item disabled>Keine Wahlen</mdui-list-item>
                )}
                {expiredVotes.map((e) => (
                  <mdui-list-item
                    rounded
                    href={`/r/${e.id}`}
                    end-icon="arrow_forward"
                  >
                    {e.title}
                  </mdui-list-item>
                ))}
              </>
            </div>
          </mdui-collapse-item>
        </mdui-collapse>
      </mdui-list>
    </div>
  );
}

export default App;

export async function loader() {
  const votes = await getDocs(collection(db, "/votes"));
  const activeVotes = [];
  const expiredVotes = [];
  const scheduledVotes = [];

  votes.docs.map((e) => {
    let data = e.data();
    console.log(data, e.id);
    if (Date.now() > data.startTime.seconds * 1000) {
      if (data.active && Date.now() < data.endTime.seconds * 1000) {
        activeVotes.push({ id: e.id, title: data.title });
      } else {
        expiredVotes.push({ id: e.id, title: data.title });
      }
      return;
    }
    scheduledVotes.push({ id: e.id, title: data.title });
  });
  return { activeVotes, expiredVotes, scheduledVotes };
}

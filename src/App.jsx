import { collection, getDocs } from "firebase/firestore";
import moment from "moment-timezone";
import { useLoaderData } from "react-router-dom";
import { db } from "./firebase";
import VoteCard from './VoteCard.jsx'; // Import VoteCard

function App() {
  const { activeVotes, expiredVotes, scheduledVotes } = useLoaderData();

  return (
    <div className="mdui-prose">
      <div style={{ position: "fixed", top: 0, left: 0, padding: "1rem" }}>
        <mdui-button-icon icon="admin_panel_settings" href="/admin" />
      </div>
      <div style={{ position: "fixed", top: 0, right: 0, padding: "1rem" }}>
        <mdui-button-icon
          icon="code"
          href="https://github.com/johangrims/waldorfwahlen"
        />
      </div>
      <p />
      <div style={{ display: "flex", justifyContent: "center" }}>
        <img src="/WSP.png" alt="Logo" className="waldorf-logo" />
      </div>
      <p />
      <h1 style={{ marginBottom: "10px" }}>WaldorfWahlen</h1>
      <div
        style={{
          textAlign: "center",
          gap: "10px",
          display: "flex",
          justifyContent: "space-around",
        }}
      >
        <a href="https://waldorfschule-potsdam.de/impressum/">Impressum</a>
        <a href="https://waldorfschule-potsdam.de/datenschutz/">Datenschutz</a>
      </div>
      <p />
      {/* Active Votes Section - Replaced with horizontal scrolling VoteCards */}
      <div className="carousel-container" style={{ padding: '10px 0' }}> {/* Applied carousel-container class */}
        {activeVotes.length < 1 ? (
          <p className="no-votes-message" style={{ flexGrow: 1 }}>Keine Wahlen</p> // Applied class and ensured it can take full width
        ) : (
          activeVotes
            .sort((a, b) => {
              return b.startTime.seconds - a.startTime.seconds;
            })
            .map((vote) => (
              <VoteCard
                key={vote.id}
                id={vote.id}
                title={vote.title}
                endTime={vote.endTime} // Pass endTime to VoteCard
              />
            ))
        )}
      </div>
      {/* End of Active Votes Section */}
      <mdui-list> {/* This list now only contains the collapse items */}
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
                {scheduledVotes
                  .sort((a, b) => {
                    return b.startTime.seconds - a.startTime.seconds;
                  })
                  .map((e) => (
                    <mdui-list-item
                      key={e.id}
                      rounded
                      href={`/${e.id}`}
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
                {expiredVotes
                  .sort((a, b) => {
                    return b.startTime.seconds - a.startTime.seconds;
                  })
                  .map((e) => (
                    <mdui-list-item
                      key={e.id}
                      rounded
                      href={`/${e.id}`}
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

App.loader = async function loader() {
  const votes = await getDocs(collection(db, "/votes"));
  const activeVotes = [];
  const expiredVotes = [];
  const scheduledVotes = [];

  votes.docs.map((e) => {
    let data = e.data();

    const now = moment().tz("Europe/Berlin");
    const startTime = moment.unix(data.startTime.seconds).tz("Europe/Berlin");
    const endTime = moment.unix(data.endTime.seconds).tz("Europe/Berlin");

    if (now.isAfter(startTime)) {
      if (data.active && now.isBefore(endTime)) {
        activeVotes.push({
          id: e.id,
          title: data.title,
          startTime: data.startTime,
          endTime: data.endTime, // Add endTime to activeVotes objects
        });
      } else {
        expiredVotes.push({
          id: e.id,
          title: data.title,
          startTime: data.startTime,
          // Optionally add endTime to expiredVotes if needed elsewhere
          // endTime: data.endTime, 
        });
      }
      return;
    }
    scheduledVotes.push({
      id: e.id,
      title: data.title,
      startTime: data.startTime,
      // Optionally add endTime to scheduledVotes if needed elsewhere
      // endTime: data.endTime,
    });
  });

  return { activeVotes, expiredVotes, scheduledVotes };
};

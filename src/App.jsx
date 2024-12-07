import { collection, getDocs } from "firebase/firestore";
import moment from "moment-timezone";
import { useLoaderData } from "react-router-dom";
import "./App.css";
import { db } from "./firebase";
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
      <mdui-list>
        {activeVotes.length < 1 && (
          <mdui-list-item disabled>Keine Wahlen</mdui-list-item>
        )}
        {activeVotes
          .sort((a, b) => {
            return b.startTime.seconds - a.startTime.seconds;
          })
          .map((vote) => (
            <mdui-list-item
              key={vote.id}
              href={`/${vote.id}`}
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
    console.log(data, e.id);

    const now = moment().tz("Europe/Berlin");
    const startTime = moment.unix(data.startTime.seconds).tz("Europe/Berlin");
    const endTime = moment.unix(data.endTime.seconds).tz("Europe/Berlin");

    if (now.isAfter(startTime)) {
      if (data.active && now.isBefore(endTime)) {
        activeVotes.push({
          id: e.id,
          title: data.title,
          startTime: data.startTime,
        });
      } else {
        expiredVotes.push({
          id: e.id,
          title: data.title,
          startTime: data.startTime,
        });
      }
      return;
    }
    scheduledVotes.push({
      id: e.id,
      title: data.title,
      startTime: data.startTime,
    });
  });

  return { activeVotes, expiredVotes, scheduledVotes };
};

import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { snackbar } from "mdui";
import React from "react";
import { useLoaderData, useNavigate, useParams } from "react-router-dom";
import { db } from "../../firebase";

import moment from "moment-timezone";
import AdminVote from ".";
export default function Schedule() {
  const { id } = useParams();
  const { vote } = useLoaderData();

  const navigate = useNavigate();

  const [active, setActive] = React.useState(vote.active);
  const [startTime, setStartTime] = React.useState(
    moment
      .tz(vote.startTime?.seconds * 1000, "Europe/Berlin")
      .format("YYYY-MM-DDTHH:mm")
  );
  const [endTime, setEndTime] = React.useState(
    moment
      .tz(vote.endTime?.seconds * 1000, "Europe/Berlin")
      .format("YYYY-MM-DDTHH:mm")
  );

  const switchRef = React.useRef(null);

  React.useEffect(() => {
    const handleToggle = () => {
      setActive(switchRef.current.checked);
    };

    switchRef.current.addEventListener("change", handleToggle);
  }, []);

  function save() {
    setDoc(doc(db, `/votes/${id}`), {
      ...vote,
      active: active,
      startTime: Timestamp.fromDate(
        moment.tz(startTime, "Europe/Berlin").toDate()
      ),
      endTime: Timestamp.fromDate(moment.tz(endTime, "Europe/Berlin").toDate()),
    })
      .then(() => {
        console.log("Saved");
        snackbar({ message: "Einstellungen gespeichert." });
        navigate(`/admin/${id}`);
      })
      .catch((e) => {
        console.error(e);
        snackbar({ message: "Fehler beim Speichern." });
      });
  }

  return (
    <>
      <AdminVote />
      <mdui-dialog open={true} headline="Status einstellen">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <mdui-switch checked={vote.active} ref={switchRef}></mdui-switch>
          <label>Nutzern erlauben, Wahlen abzugeben</label>
        </div>
        <p />
        {active && (
          <div className="fields-row">
            <mdui-text-field
              value={startTime}
              onInput={(e) => setStartTime(e.target.value)}
              label="Startzeitpunkt"
              type="datetime-local"
            ></mdui-text-field>
            <mdui-text-field
              value={endTime}
              onInput={(e) => setEndTime(e.target.value)}
              label="Endzeitpunkt"
              type="datetime-local"
            ></mdui-text-field>
          </div>
        )}
        <p />
        <div className="button-container">
          <mdui-button variant="text" onClick={() => navigate(`/admin/${id}`)}>
            Abbrechen
          </mdui-button>
          <mdui-button onClick={save}>Speichern</mdui-button>
        </div>
      </mdui-dialog>
    </>
  );
}

export async function loader({ params }) {
  const { id } = params;
  const vote = await getDoc(doc(db, `/votes/${id}`));
  const data = vote.data();
  return {
    ...data,
  };
}

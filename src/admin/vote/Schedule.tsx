import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
  DocumentData,
} from "firebase/firestore";
import { snackbar } from "mdui";
import React from "react";
import {
  LoaderFunctionArgs,
  useLoaderData,
  useNavigate,
  useParams,
} from "react-router-dom";
import { db } from "../../firebase";

import moment from "moment-timezone";
import AdminVote from ".";

interface VoteData extends DocumentData {
  active: boolean;
  startTime: Timestamp;
  endTime: Timestamp;
}

interface LoaderData {
  vote: VoteData;
}

export default function Schedule() {
  const { id } = useParams<{ id: string }>();
  const { vote } = useLoaderData() as LoaderData;

  const navigate = useNavigate();

  const [active, setActive] = React.useState<boolean>(vote.active);
  const [startTime, setStartTime] = React.useState<string>(
    moment
      .tz(vote.startTime?.seconds * 1000, "Europe/Berlin")
      .format("YYYY-MM-DDTHH:mm")
  );
  const [endTime, setEndTime] = React.useState<string>(
    moment
      .tz(vote.endTime?.seconds * 1000, "Europe/Berlin")
      .format("YYYY-MM-DDTHH:mm")
  );

  const switchRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleToggle = () => {
      if (switchRef.current) {
        setActive(switchRef.current.checked);
      }
    };

    if (switchRef.current) {
      switchRef.current.addEventListener("change", handleToggle);
    }

    return () => {
      if (switchRef.current) {
        switchRef.current.removeEventListener("change", handleToggle);
      }
    };
  }, []);

  function save() {
    if (!id) return;
    setDoc(doc(db, `/votes/${id}`), {
      ...vote,
      active: active,
      startTime: Timestamp.fromDate(
        moment.tz(startTime, "Europe/Berlin").toDate()
      ),
      endTime: Timestamp.fromDate(moment.tz(endTime, "Europe/Berlin").toDate()),
    })
      .then(() => {
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
      <mdui-dialog open headline="Status einstellen" icon="schedule">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <mdui-switch checked={vote.active} ref={switchRef}></mdui-switch>
          <label>Nutzern erlauben, Wahlen abzugeben</label>
        </div>
        <p />
        {active && (
          <div>
            <mdui-text-field
              value={startTime}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                setStartTime(e.target.value)
              }
              label="Startzeitpunkt"
              type="datetime-local"
            ></mdui-text-field>
            <p />
            <mdui-text-field
              value={endTime}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEndTime(e.target.value)
              }
              label="Endzeitpunkt"
              type="datetime-local"
            ></mdui-text-field>
          </div>
        )}
        <p />
        <mdui-button slot="action" variant="text" onClick={() => navigate(-1)}>
          Abbrechen
        </mdui-button>
        <mdui-button slot="action" onClick={save}>
          Speichern
        </mdui-button>
      </mdui-dialog>
    </>
  );
}

export async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params as { id: string };
  const vote = await getDoc(doc(db, `/votes/${id}`));
  const data = vote.data() as VoteData;
  return {
    vote: data,
  };
}

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
import { db } from "../../../firebase";

import { toBerlinDatetimeLocal, parseBerlinDateTime } from "../../../utils/date";

interface VoteData extends DocumentData {
  active: boolean;
  startTime: Timestamp;
  endTime: Timestamp;
}

interface LoaderData {
  vote: VoteData;
}

export default function V2Schedule() {
  const { id } = useParams<{ id: string }>();
  // V2Schedule does not define its own loader, it relies on V2Layout's loader which provides V2LoaderData.
  // Wait, in main.jsx I defined `loader: loaderModule.default.loader` for it, so it DOES receive V2LoaderData.
  const { vote } = useLoaderData() as LoaderData;

  const navigate = useNavigate();

  const [active, setActive] = React.useState<boolean>(vote.active);
  const [startTime, setStartTime] = React.useState<string>(
    typeof vote.startTime?.seconds === "number" ? toBerlinDatetimeLocal(vote.startTime.seconds) : ""
  );
  const [endTime, setEndTime] = React.useState<string>(
    typeof vote.endTime?.seconds === "number" ? toBerlinDatetimeLocal(vote.endTime.seconds) : ""
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
    setDoc(doc(db, `schools/SCHOOLID/v2_votes/${id}`), {
      ...vote,
      active: active,
      startTime: Timestamp.fromDate(
        parseBerlinDateTime(startTime)
      ),
      endTime: Timestamp.fromDate(parseBerlinDateTime(endTime)),
    })
      .then(() => {
        snackbar({ message: "Einstellungen gespeichert." });
        navigate(`/v2/admin/vote/${id}/manage`);
      })
      .catch((e) => {
        console.error(e);
        snackbar({ message: "Fehler beim Speichern." });
      });
  }

  return (
    <>
      <mdui-dialog open headline="Status einstellen" icon="schedule" closeOnEsc={false} closeOnOverlayClick={false}>
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

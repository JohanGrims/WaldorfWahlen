import { doc, getDoc } from "firebase/firestore";
import React from "react";
import { useLoaderData, useNavigate, useParams } from "react-router-dom";
import { db } from "./firebase";

export default function Result() {
  let { id } = useParams();
  const navigate = useNavigate();
  const { vote, options } = useLoaderData();
  const { result } = vote;

  const [voteResult, setVoteResult] = React.useState();

  React.useEffect(() => {
    if (vote.result && localStorage.getItem(id)) {
      const choiceId = JSON.parse(localStorage.getItem(id)).choiceId;
      getDoc(doc(db, `/votes/${id}/results/${choiceId}`)).then((doc) => {
        setVoteResult(doc.data());
      });
    }
  }, []);

  if (!result) {
    return (
      <mdui-dialog open headline="Die Wahl ist beendet">
        <div className="mdui-prose">
          <p>
            Die Wahl ist beendet. Es sind (noch) keine Ergebnisse online
            verfügbar. Bei Fragen oder Problemen melden Sie sich beim
            zuständigen Lehrer.
          </p>
        </div>
        <p />
        <div className="button-container">
          <mdui-button onClick={() => navigate("/")} variant="text" icon="home">
            Startseite
          </mdui-button>
          <mdui-button disabled variant="text">
            {JSON.parse(localStorage.getItem(id))?.choiceId}
          </mdui-button>
        </div>
      </mdui-dialog>
    );
  }

  if (!voteResult) {
    return (
      <mdui-dialog open headline="Das Wahlergebnis ist da!">
        <div className="mdui-prose">
          <p>
            Es sieht so aus, als hätten Sie aber nicht von diesem Gerät
            gewählt...
          </p>
          <p>Kontaktieren Sie für die Ergebnisse den zuständigen Lehrer.</p>
        </div>
        <p />
        <div className="button-container">
          <mdui-button onClick={() => navigate("/")} variant="text" icon="home">
            Startseite
          </mdui-button>
        </div>
      </mdui-dialog>
    );
  }

  return (
    <mdui-dialog open headline="Das Wahlergebnis ist da!">
      <div className="mdui-prose">
        <p>Es sieht so aus, als wären Sie im Projekt...</p>
        <p>...Trommelwirbel...</p>
        <b style={{ fontSize: "30px" }}>
          {options.find((option) => voteResult.result === option.id).title}
        </b>
      </div>
      <p />
      <div className="button-container">
        <mdui-button onClick={() => navigate("/")} variant="text" icon="home">
          Startseite
        </mdui-button>
      </div>
    </mdui-dialog>
  );
}

export async function loader({ params }) {
  const { id } = params;
  const vote = (await getDoc(doc(db, `/votes/${id}`))).data();
  const options = (
    await getDocs(collection(db, `/votes/${id}/options`))
  ).docs.map((doc) => {
    return { id: doc.id, ...doc.data() };
  });

  return { vote, options };
}

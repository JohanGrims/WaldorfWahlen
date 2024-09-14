import { doc, getDoc } from "firebase/firestore/lite";
import React from "react";
import { useLoaderData, useNavigate, useParams } from "react-router-dom";
import { db } from "./firebase";

import "./result.css";

export default function Result() {
  let { id } = useParams();
  const navigate = useNavigate();
  const { vote } = useLoaderData();
  const { results, title, active } = vote;

  if (active === true) {
    navigate(`/v/${id}`);
  }

  if (!results) {
    return (
      <div className="result-container">
        <div className="result-content">
          <div className="result-message">
            <h2>Die Wahl ist beendet</h2>
            <p>
              Die Wahl ist beendet. Es sind (noch) keine Ergebnisse online
              verfügbar. Bei Fragen oder Problemen melde Dich beim betreuenden
              Lehrer der Wahl oder den SV-Vertretern Deiner Klasse.
            </p>
          </div>
          <div className="result-details">
            <img className="result-image" src="/WSP.png" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div>
      <h2 style={{ textAlign: "center" }}>{title}</h2>
      {!results ? (
        <div style={{ padding: "0px 30px 0px 30px" }}>
          Die Wahl ist beendet. Es sind (noch) keine Ergebnisse online
          verfügbar. Bei Fragen oder Problemen melde Dich beim betreuenden
          Lehrer der Wahl oder den SV-Vertretern Deiner Klasse.
        </div>
      ) : (
        <table style={{ width: "100%" }}>
          {JSON.parse(results).map((e) => (
            <tr>
              {e.map((e) => (
                <td>{e.replaceAll('"', "")}</td>
              ))}
            </tr>
          ))}
        </table>
      )}
    </div>
  );
}

export async function loader({ params }) {
  const { id } = params;
  const vote = (await getDoc(doc(db, `/votes/${id}`))).data();
  return { vote };
}

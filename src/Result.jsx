import { doc, getDoc } from "firebase/firestore/lite";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "./firebase";

export default function Result() {
  let { id } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = React.useState();
  const [title, setTitle] = React.useState("");
  const [active, setActive] = React.useState();

  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    getDoc(doc(db, `/votes/${id}`)).then((e) => {
      let data = e.data();
      setResult(data.results);
      setTitle(data.title);
      setActive(data.active);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div />;
  }

  if (active === true) {
    navigate(`/v/${id}`);
  }

  return (
    <div>
      <h2>{title}</h2>
      {!result ? (
        "Keine Ergebnisse online verfügbar"
      ) : (
        <table style={{ width: "100%" }}>
          {JSON.parse(result).map((e) => (
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

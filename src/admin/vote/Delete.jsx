import { deleteDoc, doc } from "firebase/firestore/lite";
import { snackbar } from "mdui";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminVote from ".";
import { db } from "../../firebase";

export default function Delete() {
  const { id } = useParams();
  const [confirmtion, setConfirmation] = React.useState("");

  const navigate = useNavigate();

  function deleteVote() {
    deleteDoc(doc(db, "/votes", id))
      .then(() => {
        snackbar({ message: "Wahl gelöscht." });
        navigate("/admin");
      })
      .catch((e) => {
        console.error(e);
        snackbar({ message: "Fehler beim Löschen der Wahl." });
      });
  }
  return (
    <>
      <AdminVote />
      <mdui-dialog open={true} headline="Wahl löschen">
        <p>
          Wollen Sie diese Wahl wirklich löschen? Sie können Sie danach nicht
          mehr aufrufen. Antworten können nur noch über die API abgerufen
          werden.
        </p>
        <p>
          Geben Sie zur Bestätigung <code>{id}</code> ein:{" "}
        </p>
        <mdui-text-field
          value={confirmtion}
          onInput={(e) => setConfirmation(e.target.value)}
          label="Bestätigen"
          onPaste={(e) => {
            return e.preventDefault();
          }}
        ></mdui-text-field>
        <p />
        <div className="button-container">
          <mdui-button variant="text" onClick={() => navigate(`/admin/${id}`)}>
            Abbrechen
          </mdui-button>
          {confirmtion === id ? (
            <mdui-button onClick={deleteVote}>Endgültig löschen</mdui-button>
          ) : (
            <mdui-button disabled>Endgültig löschen</mdui-button>
          )}
        </div>
      </mdui-dialog>
    </>
  );
}

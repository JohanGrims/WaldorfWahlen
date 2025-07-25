import { deleteDoc, doc } from "firebase/firestore";
import { snackbar } from "mdui";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminVote from ".";
import { db } from "../../firebase";

export default function Delete() {
  const { id } = useParams<{ id: string }>();
  const [confirmtion, setConfirmation] = React.useState<string>("");

  const navigate = useNavigate();

  function deleteVote() {
    if (!id) return;
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
      <mdui-dialog open={true} headline="Wahl löschen" icon="delete">
        <p>
          Wollen Sie diese Wahl wirklich löschen? Sie können Sie danach nicht
          mehr aufrufen. Die Daten können wiederhergestellt werden, kontaktieren
          Sie mich dafür.
        </p>
        <p>
          Geben Sie zur Bestätigung <code>{id}</code> ein:{" "}
        </p>
        <mdui-text-field
          value={confirmtion}
          onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
            setConfirmation(e.target.value)
          }
          label="Bestätigung"
          onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
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

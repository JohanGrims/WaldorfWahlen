import { addDoc, collection, doc, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import { db } from "./firebase";
import { useLoaderData, useNavigate, useParams } from "react-router-dom";
import { alert, confirm } from "mdui";

export default function Propose() {
  let { id } = useParams();
  const navigate = useNavigate();
  const { vote } = useLoaderData();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teacher, setTeacher] = useState("");
  const [max, setMax] = useState<number | undefined>();

  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    await addDoc(collection(db, `/votes/${id}/proposals`), {
      name: name,
      description: description,
      teacher: teacher,
      max: max,
    })
      .then(() => {
        setLoading(false);
        confirm({
          headline: "Vorschlag eingereicht",
          description: "Dein Vorschlag wurde erfolgreich eingereicht.",
          confirmText: "Zurück zur Übersicht",
          cancelText: "",
          onConfirm: () => {
            navigate(`/`);
          },
        });
      })
      .catch((error) => {
        setLoading(false);
        alert({
          headline: "Fehler",
          description: `Es gab ein Problem beim Einreichen: ${error.message}`,
        });
      });
  }

  const submitDisabled = () => {
    if (
      !name ||
      name.length < 3 ||
      name.length > 25 ||
      !max ||
      max < 1 ||
      max > 100
    ) {
      return true;
    }

    return false;
  };

  return (
    <div className="mdui-prose">
      <p />
      <h1>{vote.title}</h1>

      <mdui-text-field
        label="Titel"
        placeholder="Programmieren: KI"
        maxlength={25}
        counter
        value={name}
        onInput={(e) => setName(e.target.value)}
      ></mdui-text-field>
      <mdui-text-field
        label="max. SchülerInnen"
        type="number"
        placeholder="15"
        min={1}
        value={max}
        onInput={(e) => setMax(e.target.value)}
      ></mdui-text-field>
      <p />
      <br />
      <mdui-text-field
        label="Lehrer (optional)"
        placeholder="Hr. Mustermann"
        maxlength={25}
        counter
        value={teacher}
        onInput={(e) => setTeacher(e.target.value)}
      ></mdui-text-field>
      <mdui-text-field
        label="Beschreibung (optional)"
        placeholder="Was ist Programmieren? Was ist KI? Diesen Themen wollen wir uns in dieser Projektwoche nähern."
        rows={3}
        maxlength={100}
        counter
        value={description}
        onInput={(e) => setDescription(e.target.value)}
      ></mdui-text-field>

      {submitDisabled() || loading ? (
        <mdui-button raised disabled>
          Vorschlag einreichen
        </mdui-button>
      ) : (
        <mdui-button raised onClick={submit}>
          Vorschlag einreichen
        </mdui-button>
      )}
    </div>
  );
}

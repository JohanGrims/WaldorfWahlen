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
        alert({
          icon: "check_circle",
          headline: "Vorschlag eingereicht",
          description: "Dein Vorschlag wurde erfolgreich eingereicht.",
          confirmText: "Zurück zur Übersicht",
          onConfirm: () => {
            navigate(`/`);
          },
        });
      })
      .catch((error) => {
        setLoading(false);
        alert({
          icon: "error",
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

  React.useEffect(() => {
    alert({
      icon: "info",
      headline: "Vorschlag einreichen",
      description:
        "Hallo. Du bist dabei, einen Vorschlag für ein Projekt einzureichen. Danke! Das erleichert den Administratoren die Übersicht über die Daten und stellt sicher, dass alles so ist, wie es sein soll. Stelle sicher, dass Du die Felder so ausfüllst, wie sie am Ende aussehen sollen. Unten siehst Du eine Vorschau deines Projekts. Die Zeichenlimits sind layoutbedingt und können nicht überschritten werden. ",
      confirmText: "Verstanden",
      onConfirm: () => {
        alert({
          icon: "warning",
          headline: "Hinweis",
          description:
            "Der Titel sollte kurz und prägnant sein. Die Beschreibung sollte das Projekt gut umreißen und eventuelle Beschränkungen erwähnen. Trage die maximale Anzahl an SchülerInnen so ein, wie es bei der Anmeldung abgesprochen wurde. Alle Vorschläge werden manuell von den Administratoren geprüft und freigeschaltet.",
          confirmText: "Loslegen",
        });
      },
    });
  }, []);

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
        label="Lehrer / Anbietende (optional)"
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

      <mdui-divider></mdui-divider>
      <mdui-card
        clickable
        style={{
          cursor: "pointer",
          width: "100%",
        }}
        class={`option-card`}
        variant={"elevated"}
      >
        <b className="title">
          {name || "Programmieren: KI"}
          <mdui-badge
            style={{
              backgroundColor: "transparent",
              color: "white",
            }}
          >
            <mdui-icon name="group"></mdui-icon>
            {max || 15}
          </mdui-badge>
        </b>
        {teacher && (
          <div className="teacher">
            <mdui-icon name="person"></mdui-icon>
            {teacher}
          </div>
        )}
        {description && <div className="description">{description}</div>}
      </mdui-card>
      <p />

      <div style={{ display: "flex", justifyContent: "end" }}>
        {submitDisabled() || loading ? (
          <mdui-fab extended disabled icon="send">
            Vorschlag einreichen
          </mdui-fab>
        ) : (
          <mdui-fab extended onClick={submit} icon="send">
            Vorschlag einreichen
          </mdui-fab>
        )}
      </div>
    </div>
  );
}

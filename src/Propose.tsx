import { addDoc, collection, doc, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import { db } from "./firebase";
import { useLoaderData, useNavigate, useParams } from "react-router-dom";
import { alert, confirm, breakpoint, snackbar } from "mdui";
import CheckItem from "./CheckItem";

export default function Propose() {
  let { id } = useParams();
  const navigate = useNavigate();
  const { vote } = useLoaderData();
  const breakpointCondition = breakpoint();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teacher, setTeacher] = useState("");
  const [max, setMax] = useState<number | undefined>();

  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = React.useState(false);

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

  function confirmSubmit() {
    setConfirmDialog(true);
  }

  function resetForm() {
    confirm({
      icon: "refresh",
      headline: "Zurücksetzen",
      description: "Möchten Sie wirklich alle Eingaben zurücksetzen?",
      onConfirm: () => {
        setName("");
        setDescription("");
        setTeacher("");
        setMax(undefined);
      },
      confirmText: "Zurücksetzen",
      cancelText: "Abbrechen",
    });
  }

  React.useEffect(() => {
    if (vote.proposals) {
      alert({
        icon: "info",
        headline: "Vorschlag einreichen",
        description:
          "Sie sind dabei, einen Vorschlag für ein Projekt einzureichen. Vielen Dank! Das erleichtert den Administratoren die Übersicht über die Daten und stellt sicher, dass alles so ist, wie es sein soll. Bitte stellen Sie sicher, dass Sie die Felder so ausfüllen, wie sie am Ende aussehen sollen. Unten sehen Sie eine Vorschau Ihres Projekts. Die Zeichenlimits sind layoutbedingt und können nicht überschritten werden.",
        confirmText: "Verstanden",
        onConfirm: () => {
          alert({
            icon: "warning",
            headline: "Hinweis",
            description:
              "Der Titel sollte kurz und prägnant sein. Die Beschreibung sollte das Projekt gut umreißen und eventuelle Beschränkungen erwähnen. Tragen Sie die maximale Anzahl an SchülerInnen so ein, wie es bei der Anmeldung abgesprochen wurde. Alle Vorschläge werden manuell von den Administratoren geprüft und freigeschaltet.",
            confirmText: "Loslegen",
          });
        },
      });
    } else {
      alert({
        icon: "error",
        headline: "Vorschläge deaktiviert",
        description: "Es sind keine Vorschläge für dieses Projekt möglich.",
        confirmText: "Zurück zur Übersicht",
        onConfirm: () => {
          navigate(`/`);
        },
      });
    }
  }, []);

  return (
    <div className="container">
      <mdui-dialog open={confirmDialog} headline="Bestätigen" icon="check">
        <div className="mdui-prose">
          <p>Bitte überprüfen Sie Ihre Eingaben für den Projektvorschlag.</p>
          Titel: {name}
          <br />
          Max. SchülerInnen: {max}
          <br />
          {teacher && (
            <>
              Lehrer / Anbietende: {teacher}
              <br />
            </>
          )}
          {description && (
            <>
              Beschreibung: {description}
              <br />
            </>
          )}
          <p />
          {!loading ? (
            <div className="button-container">
              <mdui-button
                onClick={() => setConfirmDialog(false)}
                variant="text"
              >
                Abbrechen
              </mdui-button>
              <mdui-button onClick={submit} end-icon="send">
                Absenden
              </mdui-button>
            </div>
          ) : (
            <div className="button-container">
              <mdui-button variant="text" disabled>
                Abbrechen
              </mdui-button>
              <mdui-button end-icon="send" disabled loading>
                Absenden
              </mdui-button>
            </div>
          )}
        </div>
      </mdui-dialog>

      <mdui-card
        variant={breakpointCondition.up("md") ? "outlined" : "elevated"}
        class="card"
      >
        <div className="mdui-prose">
          <h1 className="vote-title">{vote.title}</h1>
        </div>

        <p />
        <br />
        <mdui-text-field
          label="Titel"
          placeholder="Programmieren: KI"
          maxlength={25}
          counter
          value={name}
          onInput={(e) => setName(e.target.value)}
          icon="title"
        ></mdui-text-field>
        <p />
        <mdui-text-field
          label="Lehrer / Anbietende (optional)"
          placeholder="Hr. Mustermann"
          maxlength={25}
          counter
          value={teacher}
          onInput={(e) => setTeacher(e.target.value)}
          icon="person"
        ></mdui-text-field>
        <p />
        <mdui-text-field
          label="Beschreibung (optional)"
          placeholder="Was ist Programmieren? Was ist KI? Diesen Themen wollen wir uns in dieser Projektwoche nähern."
          rows={3}
          maxlength={100}
          counter
          value={description}
          onInput={(e) => setDescription(e.target.value)}
          icon="description"
        ></mdui-text-field>
        <p />
        <mdui-text-field
          label="max. SchülerInnen"
          type="number"
          placeholder="15"
          min={1}
          value={max}
          onInput={(e) => setMax(e.target.value)}
          icon="group"
        ></mdui-text-field>
        <p />

        <br />
        <mdui-divider></mdui-divider>
        <p />
        <div className="mdui-prose">
          <h2 style={{ textAlign: "center" }}>Vorschau</h2>
        </div>
        <p />
        <mdui-card
          style={{
            width: "100%",
            margin: "0 auto",
          }}
          class={`option-card`}
          variant={"filled"}
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
        <br />

        <div className="button-container">
          <mdui-button variant="text" icon="refresh" onClick={resetForm}>
            Zurücksetzen
          </mdui-button>
          {submitDisabled() ? (
            <mdui-button disabled end-icon="send">
              Vorschlag einreichen
            </mdui-button>
          ) : (
            <mdui-button onClick={confirmSubmit} end-icon="send">
              Vorschlag einreichen
            </mdui-button>
          )}
        </div>
        <p />
        <div
          className="checks"
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <CheckItem
            label={"Titel"}
            checked={name && name.length >= 3 && name.length <= 25}
          />
          <CheckItem
            label={"Max. SchülerInnen"}
            checked={max && max >= 1 && max <= 100}
          />
          <CheckItem
            label={"Lehrer / Anbietende"}
            checked={teacher && teacher.length <= 25}
            uncheckedIcon="toggle_off"
            checkedIcon="toggle_on"
          />
          <CheckItem
            label={"Beschreibung"}
            checked={description && description.length <= 100}
            uncheckedIcon="toggle_off"
            checkedIcon="toggle_on"
          />
        </div>
      </mdui-card>
    </div>
  );
}

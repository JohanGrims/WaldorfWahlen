import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import React, { useRef } from "react";
import { useLoaderData, useNavigate, useParams } from "react-router-dom";
import { db } from "./firebase";

import moment from "moment-timezone";

import { breakpoint, confirm, snackbar } from "mdui";
import { redirect } from "react-router-dom";
import { capitalizeWords } from "./admin/utils";
import CheckItem from "./CheckItem";
export default function Vote() {
  const refs = useRef([]);
  const urlParams = new URLSearchParams(window.location.search);
  let { id } = useParams();
  const { vote, options } = useLoaderData();

  const navigate = useNavigate();
  const breakpointCondition = breakpoint();

  const {
    title,
    active,
    selectCount,
    extraFields,
    endTime,
    startTime,
    description,
  } = vote;

  const [firstName, setFirstName] = React.useState();
  const [lastName, setLastName] = React.useState();
  const [grade, setGrade] = React.useState();
  const [listIndex, setListIndex] = React.useState();
  const [selected, setSelected] = React.useState(
    Array.from({ length: selectCount }, () => "null")
  );
  const [extraFieldsValues, setExtraFieldsValues] = React.useState([]);

  const [confirmDialog, setConfirmDialog] = React.useState(false);

  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    document.title = title;
  }, [title]);

  const preview = urlParams.get("preview");

  const submitDisabled = () => {
    if (
      selected.includes("null") ||
      !firstName?.trim() ||
      !lastName?.trim() ||
      !grade ||
      !listIndex ||
      firstName?.length < 2 ||
      lastName?.length < 2 ||
      (extraFields &&
        (extraFieldsValues?.length !== extraFields?.length ||
          extraFieldsValues?.some((value) => !value?.trim()))) ||
      preview
    ) {
      return true;
    }

    return false;
  };

  const select = (index, newValue) => {
    const newArray = [...selected];
    newArray[index] = newValue;
    setSelected(newArray);
    if (newValue && refs.current[index + 1] && newValue !== "null") {
      refs.current[index + 1].scrollIntoView();
    }
  };

  function confirmSubmit() {
    setConfirmDialog(true);
  }

  function submit() {
    setSending(true);
    addDoc(collection(db, `/votes/${id}/choices`), {
      name: `${firstName} ${lastName.charAt(0)}.`,
      grade,
      listIndex,
      selected,
      extraFields: extraFieldsValues,
      version: 2,
      timestamp: serverTimestamp(),
    })
      .then((e) => {
        localStorage.setItem(
          id,
          JSON.stringify({ choiceId: e.id, timestamp: Date.now() })
        );
        if (urlParams.get("allowResubmission")) {
          navigate(`/x/${id}?allowResubmission=true`);
          return;
        }
        navigate(`/x/${id}`);
      })
      .catch((error) => {
        setSending(false);
        if (error.code === "permission-denied") {
          snackbar({
            message: "Es ist ein Berechtigungsfehler aufgetreten.",
            action: "Details",
            onActionClick: () => {
              console.error(error);
              alert(
                "Es scheint, als sei die Wahl nicht mehr verfügbar. Bitte versuchen Sie es später erneut.\n" +
                  error
              );
            },
          });
        } else if (error.message === "Network Error") {
          snackbar({
            message: "Es ist ein Netzwerkfehler aufgetreten.",
            action: "Details",
            onActionClick: () => {
              console.error(error);
              alert(
                "Es scheint, als gäbe es ein Problem mit Ihrer Internetverbindung. Bitte überprüfen Sie diese und versuchen Sie es erneut.\n" +
                  error
              );
            },
          });
        } else {
          snackbar({
            message: "Es ist ein Fehler aufgetreten.",
            action: "Details",
            onActionClick: () => {
              console.error(error);
              alert(
                "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.\n" +
                  error
              );
            },
          });
        }
      });
  }

  const handleInputChange = (index, value) => {
    const newValues = [...extraFieldsValues];
    newValues[index] = value;
    setExtraFieldsValues(newValues);
  };

  return (
    <div className="container">
      <mdui-dialog open={confirmDialog} headline="Bestätigen" icon="check">
        <div className="mdui-prose">
          <p>
            Bitte überprüfen Sie Ihre Eingaben. Sie können diese nach dem
            Absenden nicht mehr ändern.
          </p>
          Name: {firstName} {lastName}
          <br />
          Klasse: {grade}
          <br />
          Klassenlistennr.: {listIndex}
          <br />
          {extraFields?.map((e, i) => (
            <div key={i}>
              {e}: {extraFieldsValues[i]}
              <br />
            </div>
          ))}
          <br />
          Auswahl:
          <br />
          {selected
            .map(
              (e, i) =>
                `${i + 1}. ${
                  options.find((o) => o.id === e)?.title || "Keine Wahl"
                }`
            )
            .join(", ")}
          <p />
          {!sending ? (
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
          <h1 className="vote-title">{title}</h1>
          <div className="time-label">
            Endet am{" "}
            {moment
              .tz(endTime.seconds * 1000, "Europe/Berlin")
              .locale("de")
              .format("dddd, D. MMMM YYYY, HH:mm")}
          </div>
        </div>
        {vote.description && (
          <div className="mdui-prose">
            <p />
            <p>{description}</p>
          </div>
        )}
        <p />
        <br />
        <div className="flex-row">
          <mdui-text-field
            label="Vorname(n)"
            placeholder="Max Erika"
            value={firstName}
            onInput={(e) => setFirstName(capitalizeWords(e.target.value))}
            icon="person"
          ></mdui-text-field>
          <mdui-text-field
            label="Nachname"
            placeholder="Mustermann"
            value={lastName}
            onInput={(e) => setLastName(capitalizeWords(e.target.value))}
            icon="badge"
          ></mdui-text-field>
        </div>
        <p />
        <div style={{ display: "flex", gap: "20px" }}>
          <mdui-text-field
            type="number"
            label="Klasse"
            placeholder="11"
            value={grade}
            onInput={(e) => setGrade(e.target.value)}
            icon="school"
          ></mdui-text-field>
          <mdui-text-field
            type="number"
            label="Nummer"
            placeholder="17"
            value={listIndex}
            onInput={(e) => setListIndex(e.target.value)}
            icon="format_list_numbered"
          ></mdui-text-field>
        </div>
        <p />
        {extraFields?.map((e, i) => (
          <div key={i}>
            <mdui-text-field
              label={e}
              value={extraFieldsValues[i]}
              onInput={(e) =>
                handleInputChange(i, capitalizeWords(e.target.value))
              }
              icon="edit"
            ></mdui-text-field>
            <p />
          </div>
        ))}
        <p />
        <br />
        <mdui-divider></mdui-divider>
        <p />
        {Array.from({ length: selectCount }).map((e, index) => (
          <div key={index}>
            <div className="mdui-prosa">
              {selectCount > 1 && (
                <h2
                  style={{ textAlign: "center" }}
                  ref={(el) => (refs.current[index] = el)}
                >
                  {index + 1}. Wahl
                </h2>
              )}
            </div>
            <div className="flex-wrap">
              {options.map((e) => (
                <mdui-card
                  key={e.id}
                  clickable={
                    selected[index] !== e.id && !selected.includes(e.id)
                  }
                  style={{
                    cursor:
                      selected[index] !== e.id && selected.includes(e.id)
                        ? "not-allowed"
                        : "pointer",
                    backgroundColor:
                      selected[index] !== e.id &&
                      selected.includes(e.id) &&
                      "rgba(0, 0, 0, 0.1)",
                  }}
                  class={`option-card ${
                    selected[index] === e.id ? "selected" : ""
                  } ${
                    selected[index] !== e.id && selected.includes(e.id)
                      ? "disabled"
                      : ""
                  }`}
                  variant={
                    selected.includes(e.id)
                      ? selected[index] === e.id
                        ? "outlined"
                        : "filled"
                      : "elevated"
                  }
                  onClick={() => {
                    selected[index] === e.id
                      ? select(index, "null")
                      : !selected.includes(e.id) && select(index, e.id);
                  }}
                >
                  <b className="title">
                    {e.title}
                    <mdui-badge
                      style={{
                        backgroundColor: "transparent",
                        color: "white",
                      }}
                    >
                      <mdui-icon name="group"></mdui-icon>
                      {e.max}
                    </mdui-badge>
                  </b>
                  {e.teacher && (
                    <div className="teacher">
                      <mdui-icon name="person"></mdui-icon>
                      {e.teacher}
                    </div>
                  )}
                  {e.description && (
                    <div className="description">{e.description}</div>
                  )}
                </mdui-card>
              ))}
            </div>
            <p />
            <mdui-divider></mdui-divider>
          </div>
        ))}
        <p />
        <br />

        <div
          className="button-container"
          ref={(el) => (refs.current[selectCount] = el)}
        >
          <mdui-button
            variant="text"
            icon="refresh"
            onClick={() => {
              confirm({
                icon: "refresh",
                headline: "Zurücksetzen",
                description: "Möchten Sie wirklich alle Eingaben zurücksetzen?",
                onConfirm: () => {
                  setSelected(
                    Array.from({ length: selectCount }, () => "null")
                  );
                  setFirstName("");
                  setLastName("");
                  setGrade("");
                  setListIndex("");
                  setExtraFieldsValues([]);
                },
                confirmText: "Zurücksetzen",
                cancelText: "Abbrechen",
              });
            }}
          >
            Zurücksetzen
          </mdui-button>
          {preview && (
            <mdui-tooltip
              variant="rich"
              headline="Vorschau"
              content="Sie sehen eine Vorschau, da Sie den Link mit dem Parameter ?preview=true geöffnet haben. Es werden keine Daten gespeichert."
            >
              <mdui-button icon="visibility" disabled variant="text">
                Sie sehen eine Vorschau
              </mdui-button>
            </mdui-tooltip>
          )}
          {submitDisabled() ? (
            <mdui-button disabled end-icon="arrow_forward">
              Überprüfen
            </mdui-button>
          ) : (
            <mdui-button onClick={confirmSubmit} end-icon="arrow_forward">
              Überprüfen
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
            label={"Vorname(n)"}
            checked={firstName?.trim() && firstName.length >= 2}
          />
          <CheckItem
            label={"Nachname"}
            checked={lastName?.trim() && lastName.length >= 2}
          />
          <div className="break" />
          <CheckItem label={"Klasse"} checked={grade} />
          <CheckItem label={"Klassenlistennr."} checked={listIndex} />
          <div className="break" />
          {extraFields?.map((e, i) => (
            <>
              <CheckItem
                key={i}
                label={e}
                checked={extraFieldsValues[i]?.trim()}
              />
              <div className="break" />
            </>
          ))}
          {Array.from({ length: selectCount }).map((e, index) => (
            <CheckItem
              key={index}
              label={`${index + 1}. Wahl`}
              checked={selected[index] !== "null"}
            />
          ))}
        </div>
      </mdui-card>
    </div>
  );
}

Vote.loader = async function loader({ params, request }) {
  const vote = await getDoc(doc(db, `/votes/${params.id}`));
  if (!vote.exists()) {
    throw new Response("Wahl nicht gefunden.", {
      status: 404,
      statusText: "Nicht gefunden",
    });
  }
  const options = await getDocs(collection(db, `/votes/${params.id}/options`));
  const voteData = vote.data();
  const optionsData = options.docs.map((e) => ({ id: e.id, ...e.data() }));

  const type = request.url.split("/")[3];

  if (type === "v") {
    const preview = new URL(request.url).searchParams.get("preview");

    if (
      localStorage.getItem(params.id) &&
      !new URL(request.url).searchParams.get("preview")
    ) {
      if (new URL(request.url).searchParams.get("allowResubmission")) {
        return redirect(`/x/${params.id}?allowResubmission=true`);
      }
      return redirect(`/x/${params.id}`);
    }

    if (
      (voteData.active === false ||
        Date.now() > voteData.endTime.seconds * 1000) &&
      !preview
    ) {
      snackbar({ message: "Die Wahl ist bereits beendet." });
      return redirect(`/r/${params.id}`);
    }
    if (Date.now() < voteData.startTime.seconds * 1000 && !preview) {
      snackbar({
        message:
          "Die Wahl startet erst am " +
          moment
            .tz(voteData.startTime.seconds * 1000, "Europe/Berlin")
            .format("dddd, D. MMMM YYYY, HH:mm"),
      });
      return redirect(`/s/${params.id}`);
    }
  }

  return { vote: voteData, options: optionsData };
};

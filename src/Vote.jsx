import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore/lite";
import React, { useRef } from "react";
import { useLoaderData, useNavigate, useParams } from "react-router-dom";
import { db } from "./firebase";

import { confirm, snackbar } from "mdui";
import "./vote.css";

export default function Vote() {
  const refs = useRef([]);
  const urlParams = new URLSearchParams(window.location.search);
  let { id } = useParams();
  const { vote, options } = useLoaderData();

  const navigate = useNavigate();

  const { title, active, selectCount, extraFields, endTime, startTime } = vote;
  const [firstName, setFirstName] = React.useState();
  const [lastName, setLastName] = React.useState();
  const [grade, setGrade] = React.useState();
  const [listIndex, setListIndex] = React.useState();
  const [selected, setSelected] = React.useState(
    Array.from({ length: selectCount }, () => "null")
  );
  const [extraFieldsValues, setExtraFieldsValues] = React.useState([]);

  React.useEffect(() => {
    document.title = title;

    if (localStorage.getItem(id) && !urlParams.get("preview")) {
      if (urlParams.get("allowResubmission")) {
        navigate(`/submitted/${id}?allowResubmission=true`);
        window.location.href = `/submitted/${id}?allowResubmission=true`;
        return;
      }
      navigate(`/submitted/${id}`);
      window.location.href = `/submitted/${id}`;
    }
  }, []);

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

  function submit() {
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
        localStorage.setItem(id, true);
        if (urlParams.get("allowResubmission")) {
          navigate(`/submitted/${id}?allowResubmission=true`);
          return;
        }
        navigate(`/submitted/${id}`);
      })
      .catch((error) => {
        console.log(JSON.stringify(error));
        if (error.code === "permission-denied") {
          alert(
            "Da hat etwas nicht geklappt. Du bist nicht (mehr) berechtigt, deine Daten abzugeben. Bitte wende dich an den zuständigen Lehrer."
          );
        } else if (error.message === "Network Error") {
          alert(
            "Netzwerkprobleme. Bitte überprüfe deine Internetverbindung und versuche es erneut."
          );
        } else {
          alert(
            "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es später erneut."
          );
        }
      });
  }

  const handleInputChange = (index, value) => {
    const newValues = [...extraFieldsValues];
    newValues[index] = value;
    setExtraFieldsValues(newValues);
  };

  React.useEffect(() => {
    if ((active === false || Date.now() > endTime.seconds * 1000) && !preview) {
      snackbar({ message: "Die Wahl ist bereits beendet." });
      navigate(`/r/${id}`);
    }
    if (Date.now() < startTime.seconds * 1000 && !preview) {
      snackbar({
        message:
          "Die Wahl startet erst am " +
          new Date(startTime.seconds * 1000).toLocaleString("de-DE", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
          }),
      });
      navigate("/");
    }
  }, []);

  const capitalizeWords = (str) => {
    return str
      .replace(/[^a-zA-ZäöüÄÖÜß\s-]/g, "") // Remove non-alphabetic characters except hyphens and umlauts
      .replace(/\b\w/g, (char, index) => {
        if (index === 0 || str[index - 1].match(/\s/)) {
          return char.toUpperCase();
        } else if (str[index - 1] === "-") {
          return char.toUpperCase();
        }
        return char;
      }); // Capitalize words correctly
  };

  return (
    <div className="container">
      <mdui-card variant="outlined" class="card">
        <div className="mdui-prose">
          <h1 className="vote-title">{title}</h1>
          <div className="time-label">
            Endet am{" "}
            {new Date(endTime.seconds * 1000).toLocaleString("de-DE", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "numeric",
            })}
          </div>
        </div>
        <p />
        <div className="flex-row">
          <mdui-text-field
            required
            label="Vorname(n)"
            placeholder="Max Erika"
            value={firstName}
            onInput={(e) => setFirstName(capitalizeWords(e.target.value))}
          ></mdui-text-field>
          <mdui-text-field
            required
            label="Nachname"
            placeholder="Mustermann"
            value={lastName}
            onInput={(e) => setLastName(capitalizeWords(e.target.value))}
          ></mdui-text-field>
        </div>
        <p />
        <div className="flex-row">
          <mdui-text-field
            required
            type="number"
            label="Klasse"
            placeholder="11"
            value={grade}
            onInput={(e) => setGrade(e.target.value)}
          ></mdui-text-field>
          <mdui-text-field
            required
            type="number"
            label="Klassenlistennr."
            prefix="#"
            placeholder="17"
            value={listIndex}
            onInput={(e) => setListIndex(e.target.value)}
          ></mdui-text-field>
        </div>
        <p />
        {extraFields?.map((e, i) => (
          <div key={i}>
            <mdui-text-field
              required
              label={e}
              value={extraFieldsValues[i]}
              onInput={(e) =>
                handleInputChange(i, capitalizeWords(e.target.value))
              }
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
                <h2 ref={(el) => (refs.current[index] = el)}>
                  {index + 1}. Wahl
                </h2>
              )}
            </div>
            <div className="flex-wrap">
              {options.map((e) => (
                <mdui-card
                  clickable={
                    selected[index] !== e.id && !selected.includes(e.id)
                  }
                  style={{
                    cursor:
                      selected[index] !== e.id && selected.includes(e.id)
                        ? "default"
                        : "pointer",
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
                  <b>{e.title}</b>
                  <div className="teacher">{e.teacher}</div>
                  <div className="description">{e.description}</div>
                  <div className="max">max. {e.max} SchülerInnen</div>
                </mdui-card>
              ))}
            </div>
          </div>
        ))}
        <p />
        <br />
        <mdui-divider></mdui-divider>
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
              setSelected(Array.from({ length: selectCount }, () => "null"));
              setFirstName("");
              setLastName("");
              setGrade("");
              setListIndex("");
              setExtraFieldsValues([]);
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
            <mdui-button disabled end-icon="send">
              Absenden
            </mdui-button>
          ) : (
            <mdui-button onClick={submit} end-icon="send">
              Absenden
            </mdui-button>
          )}
        </div>
      </mdui-card>
    </div>
  );
}

export async function loader({ params }) {
  const vote = await getDoc(doc(db, `/votes/${params.id}`));
  if (!vote.exists()) {
    throw new Response("Document not found.", {
      status: 404,
      statusText: "Nicht gefunden",
    });
  }
  const options = await getDocs(collection(db, `/votes/${params.id}/options`));
  const voteData = vote.data();
  const optionsData = options.docs.map((e) => ({ id: e.id, ...e.data() }));

  return { vote: voteData, options: optionsData };
}

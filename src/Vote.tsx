import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
  DocumentData,
} from "firebase/firestore";
import React, { useRef } from "react";
import {
  LoaderFunctionArgs,
  useLoaderData,
  useNavigate,
  useParams,
} from "react-router-dom";
import { db } from "./firebase";

import moment from "moment-timezone";

import { breakpoint, confirm, snackbar } from "mdui";
import { redirect } from "react-router-dom";
import { capitalizeWords } from "./admin/utils";
import CheckItem from "./CheckItem";
import { Helmet } from "react-helmet";

interface VoteData extends DocumentData {
  title: string;
  active: boolean;
  selectCount: number;
  extraFields?: string[];
  endTime: Timestamp;
  startTime: Timestamp;
  description: string;
}

interface OptionData extends DocumentData {
  id: string;
  title: string;
  max: number;
  teacher?: string;
  description?: string;
}

interface LoaderData {
  vote: VoteData;
  options: OptionData[];
}

interface FeedbackData {
  satisfaction: number; // 1-5
  excitement: number; // 1-5
  easeOfProcess: number; // 1-5
  timestamp: Date;
}

export default function Vote() {
  const refs = useRef<Array<HTMLElement | null>>([]);
  const urlParams = new URLSearchParams(window.location.search);
  let { id } = useParams<{ id: string }>();
  const { vote, options } = useLoaderData() as LoaderData;

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

  // Get URL parameters for prefilling
  const urlName = urlParams.get("name");
  const urlGrade = urlParams.get("grade");
  const urlListIndex = urlParams.get("listIndex");

  // Decode URL-encoded name if present
  const decodedUrlName = urlName ? decodeURIComponent(urlName) : null;

  const [name, setName] = React.useState<string>(decodedUrlName || "");
  const [firstName, setFirstName] = React.useState<string>("");
  const [lastName, setLastName] = React.useState<string>("");
  const [grade, setGrade] = React.useState<string>(urlGrade || "");
  const [listIndex, setListIndex] = React.useState<string>(urlListIndex || "");
  const [selected, setSelected] = React.useState<string[]>(
    Array.from({ length: selectCount }, () => "null")
  );
  const [extraFieldsValues, setExtraFieldsValues] = React.useState<string[]>(
    []
  );

  const [accepted, setAccepted] = React.useState<boolean>(false);

  const [confirmDialog, setConfirmDialog] = React.useState<boolean>(false);

  const [sending, setSending] = React.useState<boolean>(false);

  // Feedback dialog state
  const [showFeedbackDialog, setShowFeedbackDialog] = React.useState<boolean>(false);
  const [satisfaction, setSatisfaction] = React.useState<number>(0);
  const [excitement, setExcitement] = React.useState<number>(0);
  const [easeOfProcess, setEaseOfProcess] = React.useState<number>(0);

  const preview = urlParams.get("preview");

  const submitDisabled = (): boolean => {
    // If name is provided via URL, use it instead of firstName/lastName
    if (decodedUrlName) {
      if (
        selected.includes("null") ||
        !name?.trim() ||
        !grade ||
        !listIndex ||
        name?.length < 2 ||
        (extraFields &&
          (extraFieldsValues?.length !== extraFields?.length ||
            extraFieldsValues?.some((value) => !value?.trim()))) ||
        !accepted
      ) {
        return true;
      }
    } else {
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
        !accepted
      ) {
        return true;
      }
    }

    return false;
  };

  const select = (index: number, newValue: string) => {
    const newArray = [...selected];
    newArray[index] = newValue;
    setSelected(newArray);
    if (newValue && refs.current[index + 1] && newValue !== "null") {
      refs.current[index + 1]?.scrollIntoView();
    }
  };

  function confirmSubmit() {
    setConfirmDialog(true);
  }

  function submit() {
    setSending(true);
    if (!id) return;

    // Use either prefilled name or firstName + lastName
    const finalName = decodedUrlName
      ? name
      : `${firstName} ${lastName.charAt(0)}.`;

    addDoc(collection(db, `/votes/${id}/choices`), {
      name: finalName,
      grade: parseInt(grade),
      listIndex: parseInt(listIndex),
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
        // Show feedback dialog instead of immediately navigating
        setConfirmDialog(false);
        setSending(false);
        setShowFeedbackDialog(true);
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

  function submitFeedback() {
    if (!id) return;
    
    const feedbackData: FeedbackData = {
      satisfaction,
      excitement,
      easeOfProcess,
      timestamp: new Date(),
    };

    addDoc(collection(db, `/votes/${id}/feedback`), {
      ...feedbackData,
      timestamp: serverTimestamp(),
    })
      .then(() => {
        setShowFeedbackDialog(false);
        navigateToSubmitted();
      })
      .catch((error) => {
        console.error("Error submitting feedback:", error);
        // Even if feedback submission fails, still navigate to submitted page
        navigateToSubmitted();
      });
  }

  function skipFeedback() {
    setShowFeedbackDialog(false);
    navigateToSubmitted();
  }

  function navigateToSubmitted() {
    if (urlParams.get("allowResubmission")) {
      navigate(`/x/${id}?allowResubmission=true`);
      return;
    }
    navigate(`/x/${id}`);
  }

  const handleInputChange = (index: number, value: string) => {
    const newValues = [...extraFieldsValues];
    newValues[index] = value;
    setExtraFieldsValues(newValues);
  };

  return (
    <div className="container">
      <Helmet>
        <title>{title} - Projektwahl</title>
        <meta name="description" content={description} />
      </Helmet>
      <mdui-dialog open={confirmDialog} headline="Bestätigen" icon="check">
        <div className="mdui-prose">
          <p>
            Bitte überprüfen Sie Ihre Eingaben. Sie können diese nach dem
            Absenden nicht mehr ändern.
          </p>
          Name: {decodedUrlName ? name : `${firstName} ${lastName}`}
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
          <small>
            Diese Website ist durch reCAPTCHA geschützt und es gelten die{" "}
            <a href="https://policies.google.com/privacy">
              Datenschutzbestimmungen
            </a>{" "}
            und{" "}
            <a href="https://policies.google.com/terms">Nutzungsbedingungen</a>{" "}
            von Google.
          </small>
          <p />
          {!sending ? (
            <div className="button-container">
              <mdui-button
                onClick={() => setConfirmDialog(false)}
                variant="text"
              >
                Abbrechen
              </mdui-button>
              <mdui-button
                onClick={submit}
                end-icon="send"
                data-umami-event="vote-submit"
                data-umami-event-grade={grade}
              >
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

      {/* Feedback Dialog */}
      <mdui-dialog open={showFeedbackDialog} headline="Feedback (freiwillig)" icon="feedback">
        <div className="mdui-prose">
          <p>
            <strong>Vielen Dank für Ihre Teilnahme!</strong>
          </p>
          <p>
            Möchten Sie uns anonymes Feedback zu dieser Wahl geben? Dies ist völlig freiwillig und hilft uns, zukünftige Wahlen zu verbessern.
          </p>
          
          <div style={{ marginTop: "24px", marginBottom: "16px" }}>
            <h4>Wie zufrieden sind Sie mit den Optionen?</h4>
            <div style={{ display: "flex", gap: "8px", justifyContent: "center", margin: "12px 0" }}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <mdui-button-icon
                  key={`satisfaction-${rating}`}
                  icon={satisfaction >= rating ? "sentiment_very_satisfied" : "sentiment_neutral"}
                  onClick={() => setSatisfaction(rating)}
                  style={{
                    color: satisfaction >= rating ? "#4CAF50" : "#999",
                    fontSize: "2rem"
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <h4>Freuen Sie sich auf die Projekte?</h4>
            <div style={{ display: "flex", gap: "8px", justifyContent: "center", margin: "12px 0" }}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <mdui-button-icon
                  key={`excitement-${rating}`}
                  icon={excitement >= rating ? "celebration" : "sentiment_neutral"}
                  onClick={() => setExcitement(rating)}
                  style={{
                    color: excitement >= rating ? "#FF9800" : "#999",
                    fontSize: "2rem"
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <h4>Wie einfach war der Wahlprozess?</h4>
            <div style={{ display: "flex", gap: "8px", justifyContent: "center", margin: "12px 0" }}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <mdui-button-icon
                  key={`ease-${rating}`}
                  icon={easeOfProcess >= rating ? "thumb_up" : "sentiment_neutral"}
                  onClick={() => setEaseOfProcess(rating)}
                  style={{
                    color: easeOfProcess >= rating ? "#2196F3" : "#999",
                    fontSize: "2rem"
                  }}
                />
              ))}
            </div>
          </div>

          <p style={{ fontSize: "0.9em", color: "#666" }}>
            <em>Das Feedback ist anonym und freiwillig.</em>
          </p>

          <div className="button-container" style={{ marginTop: "20px" }}>
            <mdui-button onClick={skipFeedback} variant="text">
              Überspringen
            </mdui-button>
            <mdui-button 
              onClick={submitFeedback} 
              end-icon="send"
              disabled={satisfaction === 0 && excitement === 0 && easeOfProcess === 0}
            >
              Feedback senden
            </mdui-button>
          </div>
        </div>
      </mdui-dialog>

      <mdui-card
        variant={breakpointCondition.up("md") ? "outlined" : "elevated"}
        className="card"
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
        {decodedUrlName ? (
          // Single name field when name is prefilled from URL
          <mdui-text-field
            label="Name"
            placeholder="Max Erika Mustermann"
            value={name}
            onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
              setName(capitalizeWords(e.target.value))
            }
            icon="person"
          ></mdui-text-field>
        ) : (
          // Separate first/last name fields when not prefilled
          <div className="flex-row">
            <mdui-text-field
              label="Vorname(n)"
              placeholder="Max Erika"
              value={firstName}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFirstName(capitalizeWords(e.target.value))
              }
              icon="person"
            ></mdui-text-field>
            <mdui-text-field
              label="Nachname"
              placeholder="Mustermann"
              value={lastName}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                setLastName(capitalizeWords(e.target.value))
              }
              icon="badge"
            ></mdui-text-field>
          </div>
        )}
        <p />
        <div style={{ display: "flex", gap: "20px" }}>
          <mdui-text-field
            type="number"
            label="Klasse"
            placeholder="11"
            value={grade}
            onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
              setGrade(e.target.value)
            }
            icon="school"
          ></mdui-text-field>
          <mdui-text-field
            type="number"
            label="Nummer"
            placeholder="17"
            value={listIndex}
            onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
              setListIndex(e.target.value)
            }
            icon="format_list_numbered"
          ></mdui-text-field>
        </div>
        <p />
        {extraFields?.map((e, i) => (
          <div key={i}>
            <mdui-text-field
              label={e}
              value={extraFieldsValues[i]}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
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
        {Array.from({ length: selectCount }).map((_, index) => (
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
              {options.map((option) => (
                <mdui-card
                  key={option.id}
                  clickable={
                    selected[index] !== option.id &&
                    !selected.includes(option.id)
                  }
                  style={{
                    cursor:
                      selected[index] !== option.id &&
                      selected.includes(option.id)
                        ? "not-allowed"
                        : "pointer",
                    backgroundColor:
                      selected[index] !== option.id &&
                      selected.includes(option.id)
                        ? "rgba(0, 0, 0, 0.1)"
                        : undefined,
                  }}
                  className={`option-card ${
                    selected[index] === option.id ? "selected" : ""
                  } ${
                    selected[index] !== option.id &&
                    selected.includes(option.id)
                      ? "disabled"
                      : ""
                  }`}
                  variant={
                    selected.includes(option.id)
                      ? selected[index] === option.id
                        ? "outlined"
                        : "filled"
                      : "elevated"
                  }
                  onClick={() => {
                    selected[index] === option.id
                      ? select(index, "null")
                      : !selected.includes(option.id) &&
                        select(index, option.id);
                  }}
                >
                  <b className="title">
                    {option.title}
                    <mdui-badge
                      style={{
                        backgroundColor: "transparent",
                        color: "white",
                      }}
                    >
                      <mdui-icon name="group"></mdui-icon>
                      {option.max}
                    </mdui-badge>
                  </b>
                  {option.teacher && (
                    <div className="teacher">
                      <mdui-icon name="person"></mdui-icon>
                      {option.teacher}
                    </div>
                  )}
                  {option.description && (
                    <div className="description">{option.description}</div>
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
        <mdui-checkbox
          checked={accepted}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setAccepted(e.target.checked)
          }
        >
          Ich willige ein, dass mein Vorname, der erste Buchstabe meines
          Nachnamens, meine Klasse sowie meine Position in der Klassenliste
          zusammen mit meinen Wahlentscheidungen zum Zweck der Durchführung und
          Auswertung der Projektwahl gespeichert und verarbeitet werden. Die
          Daten werden in einer abgesicherten Datenbank von Google Firestore
          innerhalb der EU gespeichert und sind ausschließlich für berechtigte
          Lehrkräfte zugänglich. Die Nutzung dieser Plattform ist freiwillig.
          Wenn ich nicht möchte, dass meine Daten online verarbeitet werden,
          kann ich meine Wahl stattdessen direkt bei den verantwortlichen
          Lehrer:innen abgeben.
        </mdui-checkbox>
        <p />

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
                  setAccepted(false);
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
            checked={!!(firstName?.trim() && firstName.length >= 2)}
          />
          <CheckItem
            label={"Nachname"}
            checked={!!(lastName?.trim() && lastName.length >= 2)}
          />
          <div className="break" />
          <CheckItem label={"Klasse"} checked={!!grade} />
          <CheckItem label={"Klassenlistennr."} checked={!!listIndex} />
          <div className="break" />
          {extraFields?.map((e, i) => (
            <React.Fragment key={i}>
              <CheckItem label={e} checked={!!extraFieldsValues[i]?.trim()} />
              <div className="break" />
            </React.Fragment>
          ))}
          {Array.from({ length: selectCount }).map((_, index) => (
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

Vote.loader = async function loader({ params, request }: LoaderFunctionArgs) {
  const vote = await getDoc(doc(db, `/votes/${params.id}`));
  if (!vote.exists()) {
    throw new Response("Wahl nicht gefunden.", {
      status: 404,
      statusText: "Nicht gefunden",
    });
  }
  const options = await getDocs(collection(db, `/votes/${params.id}/options`));
  const voteData = vote.data() as VoteData;
  const optionsData = options.docs.map((e) => ({
    id: e.id,
    ...e.data(),
  })) as OptionData[];

  const type = request.url.split("/")[3];

  if (type === "v") {
    const preview = new URL(request.url).searchParams.get("preview");

    if (
      params.id &&
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

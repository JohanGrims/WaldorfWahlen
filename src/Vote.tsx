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
import { db, functions } from "./firebase";

import { alert, breakpoint, confirm, prompt, snackbar } from "mdui";
import { formatBerlinTimestamp } from "./utils/date";
import { redirect } from "react-router-dom";
import { capitalizeWords } from "./admin/utils";
import CheckItem from "./CheckItem";
import { Helmet } from "react-helmet";
import { httpsCallable } from "firebase/functions";

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
  accessToken: { access_token: string; expires_in: number };
  userInfo: {
    sub?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    email?: string;
  } | null;
}

interface FeedbackData {
  satisfaction: number; // 1-5
  excitement: number; // 1-5
  easeOfProcess: number; // 1-5
}

export default function Vote() {
  const refs = useRef<Array<HTMLElement | null>>([]);
  const urlParams = new URLSearchParams(window.location.search);
  let { id } = useParams<{ id: string }>();
  const { vote, options, accessToken, userInfo } =
    useLoaderData() as LoaderData;

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
  const [showFeedbackDialog, setShowFeedbackDialog] =
    React.useState<boolean>(false);
  const [satisfaction, setSatisfaction] = React.useState<number>(0);
  const [excitement, setExcitement] = React.useState<number>(0);
  const [easeOfProcess, setEaseOfProcess] = React.useState<number>(0);

  const preview = urlParams.get("preview");

  React.useEffect(() => {
    if (userInfo) {
      if (userInfo.given_name && userInfo.family_name) {
        setFirstName(capitalizeWords(userInfo.given_name));
        setLastName(capitalizeWords(userInfo.family_name));
      } else if (userInfo.name) {
        setName(capitalizeWords(userInfo.name));
      }
    }

    if (accessToken) {
      setTimeout(() => {
        // Token expires in accessToken.expires_in seconds
        alert({
          icon: "info",
          headline: "Sitzung abgelaufen",
          description: "Bitte melden Sie sich erneut an, um fortzufahren.",
          confirmText: "Neu anmelden",
          onConfirm: () => {
            window.location.reload();
          },
        });
      }, accessToken.expires_in * 1000);
    }
  }, [userInfo, accessToken]);

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

  async function submit() {
    setSending(true);
    if (!id) return;

    // Use either prefilled name or firstName + lastName
    const finalName = decodedUrlName
      ? name
      : `${firstName} ${lastName.charAt(0)}.`;

    try {
      const response = await httpsCallable(
        functions,
        "submit_vote"
      )({
        token: accessToken ? accessToken.access_token : null,
        voteId: id,
        choice: {
          name: finalName,
          grade: parseInt(grade),
          listIndex: parseInt(listIndex),
          selected,
          extraFields: extraFieldsValues,
          version: 2,
        },
      });

      const choiceId = (response.data as any).choiceId;
      localStorage.setItem(
        id,
        JSON.stringify({ choiceId, timestamp: Date.now() })
      );
      setConfirmDialog(false);
      setSending(false);
      setShowFeedbackDialog(true);

      if ((response.data as any).error) {
        setSending(false);
        snackbar({
          message: (response.data as any).error,
          action: "Details",
          onActionClick: () => {
            alert({
              headline: "Fehler",
              description: (response.data as any).error,
              confirmText: "Neu laden",
              onConfirm: () => {
                window.location.reload();
              },
            });
          },
        });
      }
    } catch (error) {
      setSending(false);
      snackbar({
        message: "Es ist ein Fehler aufgetreten.",
        action: "Details",
        onActionClick: () => {
          alert({
            headline: "Fehler",
            description: (error as Error)?.message || "Unbekannter Fehler",
            confirmText: "Neu laden",
            onConfirm: () => {
              window.location.reload();
            },
          });
        },
      });
    }

    return;
  }

  function submitFeedback() {
    if (!id) return;

    const feedbackData: FeedbackData = {
      satisfaction,
      excitement,
      easeOfProcess,
    };

    addDoc(
      collection(db, `schools/SCHOOLID/votes/${id}/feedback`),
      feedbackData
    )
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
    if (urlParams.has("a")) {
      navigate(`/x/${id}?a=true`);
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
            <strong>
              Bitte überprüfen Sie Ihre Eingaben.
              <br />
              Sie können diese nach dem Absenden nicht mehr ändern.
            </strong>
          </p>
          <mdui-list
            style={{
              margin: "16px 0",
              lineHeight: 1.7,
              background: "transparent",
            }}
          >
            <mdui-list-item rounded>
              <mdui-icon name="person" slot="icon" style={{ marginRight: 8 }} />
              <span style={{ fontWeight: 500 }}>Name:</span>
              <span style={{ marginLeft: 8 }}>
                {decodedUrlName ? name : `${firstName} ${lastName.charAt(0)}.`}
              </span>
            </mdui-list-item>
            <mdui-list-item rounded>
              <mdui-icon name="school" slot="icon" style={{ marginRight: 8 }} />
              <span style={{ fontWeight: 500 }}>Klasse:</span>
              <span style={{ marginLeft: 8 }}>{grade}</span>
            </mdui-list-item>
            <mdui-list-item rounded>
              <mdui-icon
                name="format_list_numbered"
                slot="icon"
                style={{ marginRight: 8 }}
              />
              <span style={{ fontWeight: 500 }}>Klassenlistennr.:</span>
              <span style={{ marginLeft: 8 }}>{listIndex}</span>
            </mdui-list-item>
            {extraFields?.map((e, i) => (
              <mdui-list-item key={i} rounded>
                <mdui-icon name="edit" slot="icon" style={{ marginRight: 8 }} />
                <span style={{ fontWeight: 500 }}>{e}:</span>
                <span style={{ marginLeft: 8 }}>{extraFieldsValues[i]}</span>
              </mdui-list-item>
            ))}
            <mdui-divider style={{ margin: "12px 0" }} />
            <mdui-list-item rounded>
              <mdui-icon
                name="checklist"
                slot="icon"
                style={{ marginRight: 8 }}
              />
              <span style={{ fontWeight: 500 }}>Auswahl:</span>
            </mdui-list-item>
            {selected.map((e, i) => (
              <mdui-list-item key={i} rounded style={{ marginLeft: 24 }}>
                <mdui-icon
                  name="arrow_forward"
                  style={{ marginRight: 8 }}
                  slot="icon"
                />
                <span style={{ fontWeight: 400 }}>
                  {i + 1}.{" "}
                  {options.find((o) => o.id === e)?.title || "Keine Wahl"}
                </span>
              </mdui-list-item>
            ))}
          </mdui-list>
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
      <mdui-dialog
        open={showFeedbackDialog}
        headline="Feedback (freiwillig)"
        icon="feedback"
      >
        <div className="mdui-prose">
          <p>
            <strong>Vielen Dank für Ihre Teilnahme!</strong>
          </p>
          <p>
            Möchten Sie uns anonymes Feedback zu dieser Wahl geben? Dies ist
            völlig freiwillig und hilft uns, zukünftige Wahlen zu verbessern.
          </p>

          <div style={{ marginTop: "24px", marginBottom: "16px" }}>
            <h4>Wie zufrieden sind Sie mit den Optionen?</h4>
            <div
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "center",
                margin: "12px 0",
              }}
            >
              {[1, 2, 3, 4, 5].map((rating) => {
                const icons = [
                  "sentiment_very_dissatisfied",
                  "sentiment_dissatisfied",
                  "sentiment_neutral",
                  "sentiment_satisfied",
                  "sentiment_very_satisfied",
                ];
                const isSelected = satisfaction >= rating;
                return (
                  <mdui-button-icon
                    key={`satisfaction-${rating}`}
                    icon={icons[rating - 1]}
                    onClick={() => setSatisfaction(rating)}
                    style={{
                      color: isSelected ? "#4CAF50" : "#999",
                      fontSize: "2rem",
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <h4>Freuen Sie sich auf die Projekte?</h4>
            <div
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "center",
                margin: "12px 0",
              }}
            >
              {[1, 2, 3, 4, 5].map((rating) => {
                const icons = [
                  "sentiment_very_dissatisfied",
                  "sentiment_dissatisfied",
                  "sentiment_neutral",
                  "sentiment_satisfied",
                  "sentiment_very_satisfied",
                ];
                const isSelected = excitement >= rating;
                return (
                  <mdui-button-icon
                    key={`excitement-${rating}`}
                    icon={icons[rating - 1]}
                    onClick={() => setExcitement(rating)}
                    style={{
                      color: isSelected ? "#FF9800" : "#999",
                      fontSize: "2rem",
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <h4>Wie einfach war der Wahlprozess?</h4>
            <div
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "center",
                margin: "12px 0",
              }}
            >
              {[1, 2, 3, 4, 5].map((rating) => {
                const icons = [
                  "sentiment_very_dissatisfied",
                  "sentiment_dissatisfied",
                  "sentiment_neutral",
                  "sentiment_satisfied",
                  "sentiment_very_satisfied",
                ];
                const isSelected = easeOfProcess >= rating;
                return (
                  <mdui-button-icon
                    key={`ease-${rating}`}
                    icon={icons[rating - 1]}
                    onClick={() => setEaseOfProcess(rating)}
                    style={{
                      color: isSelected ? "#2196F3" : "#999",
                      fontSize: "2rem",
                    }}
                  />
                );
              })}
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
              disabled={
                satisfaction === 0 && excitement === 0 && easeOfProcess === 0
              }
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
            {formatBerlinTimestamp(endTime.seconds, "dd.MM.yyyy, HH:mm")}{" "}
            Uhr
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
                  style={{ textAlign: "center", scrollMarginTop: 50 }}
                  ref={(el) => {
                    refs.current[index] = el;
                  }}
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
          ref={(el) => {
            refs.current[selectCount] = el;
          }}
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
              label={`${index + 1}. Wahl (${
                options.find((o) => o.id === selected[index])?.title ||
                "keine Wahl"
              })`}
              checked={selected[index] !== "null"}
            />
          ))}
        </div>
      </mdui-card>
    </div>
  );
}

// Helper function to generate a secure random string for the code verifier
function generateCodeVerifier() {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let text = '';
  for (let i = 0; i < 128; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// Helper function to create the code challenge from the code verifier
async function generateCodeChallenge(codeVerifier: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);

  // Base64Url encode the digest
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

Vote.loader = async function loader({ params, request }: LoaderFunctionArgs) {
  let accessToken = null;
  let userInfo = null;

  const school = await getDoc(doc(db, `schools/SCHOOLID`));
  const schoolData = school.data();

  const vote = await getDoc(doc(db, `schools/SCHOOLID/votes/${params.id}`));
  if (!vote.exists()) {
    throw new Response("Wahl nicht gefunden.", {
      status: 404,
      statusText: "Nicht gefunden",
    });
  }
  const options = await getDocs(
    collection(db, `schools/SCHOOLID/votes/${params.id}/options`)
  );
  const voteData = vote.data() as VoteData;
  const optionsData = options.docs.map((e) => ({
    id: e.id,
    ...e.data(),
  })) as OptionData[];

  const type = request.url.split("/")[3];
  const preview = new URL(request.url).searchParams.get("preview");

  if (type === "v") {
    if (
      params.id &&
      localStorage.getItem(params.id) &&
      !new URL(request.url).searchParams.get("preview")
    ) {
      if (new URL(request.url).searchParams.get("a")) {
        return redirect(`/x/${params.id}?a=true`);
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
          formatBerlinTimestamp(voteData.startTime.seconds, "EEEE, d. MMMM yyyy, HH:mm"),
      });
      return redirect(`/s/${params.id}`);
    }

    // Check if .oauth config is present
    if (schoolData?.oauth?.enabled && !preview) {
      const code = new URL(request.url).searchParams.get("code");
      
      // Get the code verifier from storage
      const codeVerifier = localStorage.getItem('pkce_code_verifier');
      
      if (code && codeVerifier) {
        // Exchange code for access token
        const tokenResponse = await fetch(schoolData.oauth.tokenEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            code: code,
            client_id: schoolData.oauth.clientId,
            redirect_uri: `${window.location.origin}${window.location.pathname}`,
            grant_type: "authorization_code",
            // Include the code verifier here
            code_verifier: codeVerifier,
          }),
        });

        const tokenData = await tokenResponse.json();
        console.log("Token Data:", tokenData);
        accessToken = tokenData;
        
        // Remove code verifier from storage after use
        localStorage.removeItem('pkce_code_verifier');

        if (accessToken) {
          // Fetch user info
          const userResponse = await fetch(schoolData.oauth.userInfoEndpoint, {
            headers: {
              Authorization: `Bearer ${accessToken.access_token}`,
            },
          });

          // Remove parameters from URL
          if (window.history.replaceState) {
            const cleanUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
            window.history.replaceState({ path: cleanUrl }, "", cleanUrl);
          }

          userInfo = await userResponse.json();
        }
      } else {
        // If no code is present, redirect to OAuth authorization URL
        // Generate and store the code verifier
        const codeVerifier = generateCodeVerifier();
        localStorage.setItem('pkce_code_verifier', codeVerifier);
        
        // Generate the code challenge
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        
        const authUrl = new URL(schoolData.oauth.authorizeEndpoint);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("client_id", schoolData.oauth.clientId);
        authUrl.searchParams.set(
          "redirect_uri",
          `${window.location.origin}/v/${params.id}`
        );
        authUrl.searchParams.set("scope", "openid profile email");
        authUrl.searchParams.set("state", params.id || "");
        // Add PKCE parameters to the URL
        authUrl.searchParams.set("code_challenge", codeChallenge);
        authUrl.searchParams.set("code_challenge_method", "S256");

        console.log("Redirecting to OAuth URL:", authUrl.toString());

        window.location.href = authUrl.toString();
      }
    } else {
      console.log("OAuth not configured, skipping authentication.");
    }
  }

  return { vote: voteData, options: optionsData, accessToken, userInfo };
};

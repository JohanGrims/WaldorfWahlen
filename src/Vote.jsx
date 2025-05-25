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
  const [currentStep, setCurrentStep] = React.useState(1); // Added currentStep state
  const [currentSelectionIndex, setCurrentSelectionIndex] = React.useState(0); // Added currentSelectionIndex state


  const preview = urlParams.get("preview");

  // Renamed from submitDisabled for clarity
  const isSubmitDisabled = () => { 
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

  // Helper function to validate Step 1 inputs
  const isStep1Valid = () => {
    return (
      firstName?.trim() && firstName.length >= 2 &&
      lastName?.trim() && lastName.length >= 2 &&
      grade &&
      listIndex &&
      (!extraFields || (extraFieldsValues?.length === extraFields?.length && !extraFieldsValues?.some(value => !value?.trim())))
    );
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
    <div className="vote-container"> {/* Added vote-container class */}
      {/* Confirmation Dialog remains at the top level */}
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

      {/* Vote Title, Description, and End Time - Displayed above steps */}
      <div className="vote-header-prose"> {/* Added vote-header-prose class */}
        <h1 className="vote-title">{title}</h1>
        <div className="time-label" style={{ marginTop: '0', marginBottom: '10px' }}> {/* Adjusted inline style */}
          Endet am{" "}
          {moment
            .tz(endTime.seconds * 1000, "Europe/Berlin")
            .locale("de")
            .format("dddd, D. MMMM YYYY, HH:mm")}
        </div>
        {description && (
          <>
            <p />
            <p>{description}</p>
          </>
        )}
      </div>

      {/* Step 1: User Information */}
      {currentStep === 1 && (
        <mdui-card
          variant={breakpointCondition.up("md") ? "outlined" : "elevated"}
          class="card vote-step-card" // Added vote-step-card
        >
          <div className="mdui-prose">
            <h2 className="step-title">Schritt 1: Persönliche Angaben</h2> {/* Added step-title class */}
          </div>
          <div className="responsive-flex-row"> {/* Added responsive-flex-row class */}
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
          {/* <p /> Combined into responsive-flex-row gap */}
          <div className="responsive-flex-row">  {/* Added responsive-flex-row class */}
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
              <p /> {/* This p tag might be excessive if gap is handled by responsive-flex-row */}
            </div>
          ))}
          {/* <p /> Handled by button container margin */}
          <div className="step-button-container end-aligned"> {/* Added classes */}
            <mdui-button
              variant="filled" // Ensured filled variant
              onClick={() => setCurrentStep(2)}
              end-icon="arrow_forward"
              disabled={!isStep1Valid()}
            >
              Weiter
            </mdui-button>
          </div>
          <p />
        </mdui-card>
      )}

      {/* Step 2: Vote Selection */}
      {currentStep === 2 && (
        <mdui-card
          variant={breakpointCondition.up("md") ? "outlined" : "elevated"}
          class="card vote-step-card" // Added vote-step-card
        >
          <div className="mdui-prose">
            <h2 className="step-title"> {/* Added step-title class */}
              {selectCount > 1 ? `${currentSelectionIndex + 1}. Wahl` : "Ihre Wahl"}
            </h2>
          </div>

          <div className="carousel-container"> {/* Applied carousel-container class */}
            {options.map((e) => {
              const isSelectedForCurrent = selected[currentSelectionIndex] === e.id;
              const isSelectedForOther = selected.includes(e.id) && selected[currentSelectionIndex] !== e.id;
              const isDisabled = isSelectedForOther;

              return (
                <mdui-card
                  key={e.id}
                  clickable={!isDisabled}
                  // Inline styles related to sizing/flex are now in vote-option-card class
                  style={{ 
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    backgroundColor: isDisabled ? 'rgba(0, 0, 0, 0.07)' : undefined,
                  }}
                  className={`option-card-in-carousel vote-option-card ${isSelectedForCurrent ? "selected" : ""} ${isDisabled ? "disabled" : ""}`} // Added classes
                  variant={
                    isSelectedForCurrent
                      ? "outlined"
                      : isDisabled
                      ? "filled" 
                      : "elevated"
                  }
                  onClick={() => {
                    if (isSelectedForCurrent) {
                      select(currentSelectionIndex, "null"); // Deselect
                    } else if (!isDisabled) {
                      select(currentSelectionIndex, e.id); // Select
                    }
                  }}
                >
                  <div style={{ padding: '0px' }}> {/* Padding handled by vote-option-card or specific elements */}
                    <b className="title"> {/* Removed inline styles, handled by CSS */}
                      {e.title}
                      <mdui-badge style={{ marginLeft: '8px', backgroundColor: 'transparent', color: 'inherit' }}>
                        <mdui-icon name="group"></mdui-icon>
                        {e.max}
                      </mdui-badge>
                    </b>
                    {e.teacher && (
                      <div className="teacher"> {/* Removed inline styles, handled by CSS */}
                        <mdui-icon name="person"></mdui-icon> {/* Removed inline style */}
                        {e.teacher}
                      </div>
                    )}
                  </div>
                  {e.description && (
                    <div 
                      className="description" // Styling handled by CSS
                    >
                      {e.description}
                    </div>
                  )}
                </mdui-card>
              );
            })}
          </div>
          {/* <p /> Handled by button container margin */}
          <div className="step-button-container" style={{ padding: '0' }}> {/* Added class, removed specific padding from here */}
            {/* Previous Button */}
            {currentSelectionIndex > 0 ? (
              <mdui-button variant="text" onClick={() => setCurrentSelectionIndex(currentSelectionIndex - 1)} start-icon="arrow_back">
                Vorherige Wahl
              </mdui-button>
            ) : (
              <mdui-button variant="text" onClick={() => setCurrentStep(1)} start-icon="arrow_back">
                Persönliche Angaben
              </mdui-button>
            )}

            {/* Next Button */}
            {currentSelectionIndex < selectCount - 1 ? (
              <mdui-button 
                variant="filled" // Ensured filled variant
                onClick={() => {
                  // Optional: Auto-scroll to the top of the card or carousel if needed
                  setCurrentSelectionIndex(currentSelectionIndex + 1);
                }} 
                end-icon="arrow_forward"
                disabled={selected[currentSelectionIndex] === "null"}
              >
                Nächste Wahl
              </mdui-button>
            ) : (
              <mdui-button 
                variant="filled" // Ensured filled variant
                onClick={() => setCurrentStep(3)} 
                end-icon="playlist_add_check"
                disabled={selected[currentSelectionIndex] === "null"}
              >
                Überprüfen
              </mdui-button>
            )}
          </div>
          {/* <p/> Handled by card padding */}
        </mdui-card>
      )}

      {/* Step 3: Review */}
      {currentStep === 3 && (
        <mdui-card
          variant={breakpointCondition.up("md") ? "outlined" : "elevated"}
          class="card vote-step-card" // Added vote-step-card
        >
          <div className="mdui-prose review-section"> {/* Added review-section class */}
            <h2 className="step-title">Schritt 3: Überprüfung Ihrer Eingaben</h2> {/* Added step-title */}
            
            <h3 className="step-subtitle">Persönliche Angaben:</h3> {/* Added step-subtitle */}
            <p> {/* Removed inline style */}
              <span className="field-label">Vorname:</span> <span className="field-value">{firstName}</span><br />
              <span className="field-label">Nachname:</span> <span className="field-value">{lastName}</span><br />
              <span className="field-label">Klasse:</span> <span className="field-value">{grade}</span><br />
              <span className="field-label">Klassenlistennr.:</span> <span className="field-value">{listIndex}</span><br />
              {extraFields?.map((field, i) => (
                <span key={i}><span className="field-label">{field}:</span> {extraFieldsValues[i] ? <span className="field-value">{extraFieldsValues[i]}</span> : <span className="missing-value">Nicht angegeben</span>}<br /></span>
              ))}
            </p>

            <h3 className="step-subtitle">Ihre Wahlen:</h3> {/* Added step-subtitle */}
            {selected.map((selectionId, index) => (
              <p key={index} style={{ margin: '0.2rem 0' }}> {/* Adjusted margin slightly */}
                <span className="field-label">{selectCount > 1 ? `${index + 1}. Wahl: ` : "Auswahl: "}</span>
                {options.find(o => o.id === selectionId)?.title ? 
                  <span className="field-value">{options.find(o => o.id === selectionId)?.title}</span> : 
                  <span className="missing-value">Keine Wahl getroffen</span>}
              </p>
            ))}
            
            {preview && (
              <div className="preview-warning"> {/* Added class */}
                <mdui-icon name="visibility"></mdui-icon> {/* Removed inline styles */}
                Sie sehen eine Vorschau. Es werden keine Daten gespeichert.
              </div>
            )}

            <div className="step-button-container"> {/* Added class */}
              <mdui-button 
                variant="text" // Ensured text variant
                onClick={() => {
                  setCurrentSelectionIndex(selectCount > 0 ? selectCount - 1 : 0);
                  setCurrentStep(2);
                }} 
                start-icon="arrow_back"
              >
                Wahlen bearbeiten
              </mdui-button>
              <mdui-button 
                variant="filled" // Ensured filled variant
                onClick={confirmSubmit} 
                end-icon="send"
                disabled={isSubmitDisabled() || sending || preview}
                loading={sending}
              >
                {sending ? "Wird gesendet..." : "Absenden"}
              </mdui-button>
            </div>
          </div>
        </mdui-card>
      )}
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

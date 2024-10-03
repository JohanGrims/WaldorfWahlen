import {
  addDoc,
  collection,
  doc,
  setDoc,
  Timestamp,
} from "firebase/firestore/lite";
import { confirm, prompt, snackbar } from "mdui";
import moment from "moment-timezone";
import React from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { generateRandomHash } from "./utils";
export default function NewVote() {
  const [title, setTitle] = React.useState("");
  const [selectCount, setSelectCount] = React.useState(3);
  const [startTime, setStartTime] = React.useState();
  const [endTime, setEndTime] = React.useState();

  const [extraFields, setExtraFields] = React.useState([]);

  const [options, setOptions] = React.useState([]);

  const [name, setName] = React.useState("");
  const [teacher, setTeacher] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [max, setMax] = React.useState();

  const [id, setId] = React.useState(generateRandomHash());

  const navigate = useNavigate();

  function addOption() {
    setOptions((options) => [
      ...options,
      { title: name, max: max, teacher: teacher, description: description },
    ]);
    setName("");
    setTeacher("");
    setDescription("");
    setMax("");
  }

  function editOption(index) {
    setName(options[index].title);
    setTeacher(options[index].teacher);
    setDescription(options[index].description);
    setMax(options[index].max);
    setOptions((options) => options.filter((_, i) => i !== index));
  }

  async function publish() {
    const id = generateRandomHash();
    console.log("Generating new vote with id: " + id);
    const berlinStartTime = moment.tz(startTime, "Europe/Berlin").toDate();
    const berlinEndTime = moment.tz(endTime, "Europe/Berlin").toDate();

    const vote = await setDoc(doc(db, "/votes", id), {
      title: title,
      selectCount: selectCount,
      startTime: Timestamp.fromDate(berlinStartTime),
      endTime: Timestamp.fromDate(berlinEndTime),
      active: true,
      version: 3,
    });
    const option = options.map(async (e, index) => {
      return addDoc(collection(db, `/votes/${id}/options`), {
        title: e.title,
        max: e.max,
        teacher: e.teacher,
        description: e.description,
      });
    });

    await Promise.all(option);

    console.log("Vote created successfully.");

    snackbar({
      message: "Wahl erfolgreich erstellt.",
      timeout: 5000,
    });

    navigate(`/admin/${id}`);
  }

  const submitDisabled = () => {
    if (
      !title ||
      !selectCount ||
      !startTime ||
      !endTime ||
      options.length === 0
    ) {
      return true;
    }

    return false;
  };

  function addOptionDisabled() {
    return !name || !max;
  }

  function editExtraField(index, value) {
    const newValues = [...extraFields];
    newValues[index] = value;
    setExtraFields(newValues);
  }

  function removeExtraField(index) {
    setExtraFields((extraFields) => extraFields.filter((_, i) => i !== index));
  }

  return (
    <div className="mdui-prose">
      <div className="button-container">
        <h2>Neue Wahl</h2>

        <mdui-tooltip
          variant="rich"
          headline="Excel-Import"
          content="Noch nicht verfügbar"
        >
          <mdui-button-icon icon="upload_file"></mdui-button-icon>
        </mdui-tooltip>
      </div>
      <mdui-text-field
        label="Titel"
        placeholder="Schülerprojektwoche 2024"
        required
        maxlength={25}
        counter
        value={title}
        onInput={(e) => setTitle(e.target.value)}
      />
      <div className="fields-row">
        <mdui-tooltip
          variant="rich"
          content="Wählen Sie die Anzahl der Wahlen, die Ihre Schüler treffen müssen (1. Wahl, 2. Wahl etc.)."
        >
          <mdui-text-field
            class="number-input"
            label="Anzahl der Wahlen"
            type="number"
            placeholder="3"
            disabled
            min={1}
            max={10}
            value={selectCount}
            onInput={(e) => setSelectCount(e.target.value)}
          ></mdui-text-field>
        </mdui-tooltip>

        <div className="fields-row">
          <mdui-text-field
            label="Startzeitpunkt"
            type="datetime-local"
            value={startTime}
            onInput={(e) =>
              setStartTime(
                moment
                  .tz(e.target.value, "Europe/Berlin")
                  .format("YYYY-MM-DDTHH:mm")
              )
            }
          ></mdui-text-field>

          <mdui-text-field
            label="Endzeitpunkt"
            type="datetime-local"
            value={endTime}
            onInput={(e) =>
              setEndTime(
                moment
                  .tz(e.target.value, "Europe/Berlin")
                  .format("YYYY-MM-DDTHH:mm")
              )
            }
          ></mdui-text-field>
        </div>
      </div>
      <p />
      {extraFields.map((e, i) => (
        <>
          <div className="fields-row">
            <mdui-text-field
              label={"Extrafeld #" + (i + 1)}
              placeholder={"Musikinstrument"}
              value={e}
              onInput={(e) => editExtraField(i, e.target.value)}
            >
              <mdui-button-icon
                slot="end-icon"
                icon="delete"
                onClick={() => removeExtraField(i)}
              />
            </mdui-text-field>
          </div>
          <p />
        </>
      ))}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <mdui-tooltip
          variant="rich"
          headline="Extrafeld hinzufügen"
          content="Fügen Sie zusätzliche Felder hinzu, um weitere Informationen von Ihren Schülern zu erhalten."
        >
          <mdui-button
            icon="add"
            onClick={() => setExtraFields([...extraFields, ""])}
            variant="text"
          >
            Extrafeld hinzufügen
          </mdui-button>
        </mdui-tooltip>
        <mdui-button
          icon="settings"
          variant="text"
          end-icon="expand_more"
          onClick={() => {
            prompt({
              headline: "ID der Wahl",
              description:
                "Ändern Sie die ID der Wahl. Diese erscheint in der URL (waldorfwahlen.de/[ID]). Achten Sie darauf, dass die ID eindeutig ist und keine Sonderzeichen enthält.",
              inputType: "text",
              textFieldOptions: {
                value: id,
                onInput: (e) => setId(e.target.value),
                placeholder: "spw24",
                label: "ID",
              },
              onConfirm: (value) => setId(value),
            });
          }}
        >
          Erweitert
        </mdui-button>
      </div>

      <p />
      <mdui-divider></mdui-divider>
      <p />
      <div className="options-container">
        <div className="options-list">
          {options.length === 0 && (
            <mdui-card class="option-preview" disabled>
              <b>Keine Optionen</b>
              <div className="description">
                Fügen Sie rechts eine neue Option hinzu.
              </div>
            </mdui-card>
          )}
          {options.map((e, i) => (
            <mdui-card
              class="option-preview"
              clickable
              style={{
                cursor: "pointer",
              }}
              variant={"outlined"}
              onClick={() => {
                editOption(i);
              }}
            >
              <b>{e.title}</b>
              <div className="teacher">{e.teacher}</div>
              <div className="description">{e.description}</div>
              <div className="max">max. {e.max} SchülerInnen</div>
            </mdui-card>
          ))}
        </div>
        <div className="new-option">
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
          {addOptionDisabled() ? (
            <mdui-button
              variant="tonal"
              icon="add"
              style={{ width: "100%" }}
              onClick={addOption}
              disabled
            >
              Hinzufügen
            </mdui-button>
          ) : (
            <mdui-button
              variant="tonal"
              icon="add"
              style={{ width: "100%" }}
              onClick={addOption}
            >
              Hinzufügen
            </mdui-button>
          )}
        </div>
      </div>
      <p />
      <div className="button-container">
        <mdui-button
          variant="elevated"
          icon="refresh"
          onClick={() => {
            confirm({
              headline: "Zurücksetzen",
              description: "Möchten Sie wirklich alle Eingaben zurücksetzen?",
              onConfirm: () => {
                setTitle("");
                setSelectCount("");
                setStartTime("");
                setEndTime("");
                setOptions([]);
              },
            });
          }}
        >
          Zurücksetzen
        </mdui-button>
        {submitDisabled() ? (
          <mdui-button disabled end-icon="send">
            Erstellen
          </mdui-button>
        ) : (
          <mdui-button onClick={publish} end-icon="send">
            Erstellen
          </mdui-button>
        )}
      </div>
    </div>
  );
}

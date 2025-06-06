import { addDoc, collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { alert, confirm, prompt, snackbar } from "mdui";
import moment from "moment-timezone";
import React from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { generateRandomHash } from "./utils";
import { Helmet } from "react-helmet";
export default function NewVote() {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [selectCount, setSelectCount] = React.useState(3);
  const [startTime, setStartTime] = React.useState();
  const [endTime, setEndTime] = React.useState();

  const [extraFields, setExtraFields] = React.useState([]);

  const [options, setOptions] = React.useState([]);

  const [proposals, setProposals] = React.useState(false);

  const [name, setName] = React.useState("");
  const [teacher, setTeacher] = React.useState("");
  const [optionDescription, setOptionDescription] = React.useState("");
  const [max, setMax] = React.useState();

  const [id, setId] = React.useState(generateRandomHash());

  const navigate = useNavigate();

  function addOption() {
    setOptions((options) => [
      ...options,
      {
        title: name,
        max: max,
        teacher: teacher,
        description: optionDescription,
      },
    ]);
    setName("");
    setTeacher("");
    setOptionDescription("");
    setMax("");
  }

  function editOption(index) {
    setName(options[index].title);
    setTeacher(options[index].teacher);
    setOptionDescription(options[index].description);
    setMax(options[index].max);
    setOptions((options) => options.filter((_, i) => i !== index));
  }

  async function publish() {
    const berlinStartTime = moment.tz(startTime, "Europe/Berlin").toDate();
    const berlinEndTime = moment.tz(endTime, "Europe/Berlin").toDate();

    try {
      await setDoc(doc(db, "/votes", id), {
        title: title,
        description: description,
        selectCount: selectCount,
        startTime: Timestamp.fromDate(berlinStartTime),
        endTime: Timestamp.fromDate(berlinEndTime),
        active: true,
        version: 3,
        extraFields: extraFields,
        proposals: proposals,
      });

      if (proposals) {
        confirm({
          headline: "Hinzufügen der Vorschläge",
          description:
            "Projektanbietende können unter dem Link Vorschläge eintragen: " +
            `https://waldorfwahlen.web.app/p/${id}`,
          confirmText: "Link kopieren",
          cancelText: "Zur Wahl",
          onConfirm: (e) => {
            navigator.clipboard.writeText(
              `https://waldorfwahlen.web.app/p/${id}`
            );
            snackbar({
              message: "Link in die Zwischenablage kopiert.",
              timeout: 5000,
            });
            navigate(`/admin/${id}`);
          },
        });
      }
      if (!proposals) {
        const option = options.map(async (e) => {
          return addDoc(collection(db, `/votes/${id}/options`), {
            title: e.title,
            max: e.max,
            teacher: e.teacher,
            description: e.description,
          });
        });

        await Promise.all(option);

        snackbar({
          message: "Wahl erfolgreich erstellt.",
          timeout: 5000,
        });

        navigate(`/admin/${id}`);
      }
    } catch (e) {
      console.error(e);
      snackbar({
        message: "Fehler beim Erstellen der Wahl.",
        timeout: 5000,
      });
    }
  }

  const submitDisabled = () => {
    if (
      !title ||
      !selectCount ||
      !startTime ||
      !endTime ||
      (options.length === 0 && !proposals)
    ) {
      return true;
    }

    return false;
  };

  const isChanged = () => {
    if (
      title ||
      description ||
      selectCount !== 3 ||
      startTime ||
      endTime ||
      extraFields.length > 0 ||
      options.length > 0 ||
      proposals
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
      <Helmet>
        <title>Neue Wahl - WaldorfWahlen</title>
      </Helmet>
      <h2>Neue Wahl</h2>
      <p />
      <mdui-card
        style={{
          position: "sticky",
          top: "0px",
          zIndex: "1000",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "5px",
          borderRadius: "0px",
        }}
      >
        <div>
          Wahl {title ? `"${title}"` : "erstellen"} ({id}){" "}
        </div>
        <div>
          {isChanged() ? (
            <mdui-button-icon
              icon="replay"
              onClick={() => {
                confirm({
                  icon: "replay",
                  headline: "Änderungen verwerfen?",
                  description: "Möchten Sie die Änderungen verwerfen?",
                  confirmText: "Verwerfen",
                  cancelText: "Abbrechen",
                  onConfirm: () => {
                    setTitle("");
                    setDescription("");
                    setSelectCount(3);
                    setStartTime("");
                    setEndTime("");
                    setExtraFields([]);
                    setOptions([]);
                    setProposals(false);
                    setName("");
                    setTeacher("");
                    setOptionDescription("");
                    setMax("");
                    setId(generateRandomHash());
                  },
                });
              }}
            ></mdui-button-icon>
          ) : (
            <mdui-button-icon disabled icon="replay"></mdui-button-icon>
          )}
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
      </mdui-card>

      <p />
      <mdui-text-field
        label="Titel"
        placeholder="Schülerprojektwoche 2024"
        required
        maxlength={25}
        counter
        value={title}
        onInput={(e) => setTitle(e.target.value)}
      />
      <mdui-text-field
        label="Beschreibung (optional)"
        placeholder="In der Schülerprojektwoche vom 12. bis 16. Juli 2024 werden von SchülerInnen organisierte Projekte angeboten. Die Projekte finden täglich von 10:00 bis 15:00 in den angegebenen Räumen statt."
        rows={3}
        maxlength={200}
        counter
        value={description}
        onInput={(e) => setDescription(e.target.value)}
      ></mdui-text-field>
      <div className="fields-row">
        <mdui-tooltip
          variant="rich"
          headline="Anzahl der Wahlen"
          content="Wählen Sie die Anzahl der Wahlen, die Ihre Schüler treffen müssen (1. Wahl, 2. Wahl etc.). Achtung: Die Automatische Zuordnung funktioniert nur mit 3 Wahlen."
        >
          <mdui-text-field
            class="number-input"
            label="Anzahl der Wahlen"
            type="number"
            placeholder="3"
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
              icon: "settings",
              headline: "ID der Wahl",
              description:
                "Ändern Sie die ID der Wahl. Diese erscheint in der URL (waldorfwahlen.web.app/[ID]). Achten Sie darauf, dass die ID eindeutig ist und keine Sonderzeichen enthält.",
              inputType: "text",
              confirmText: "Schließen",
              cancelText: "",
              textFieldOptions: {
                value: id,
                onInput: (e) => setId(e.target.value),
                placeholder: "spw24",
                label: "ID",
              },
            });
          }}
        >
          Erweitert
        </mdui-button>
      </div>

      <p />
      <mdui-divider></mdui-divider>
      <p />

      <div className="flex-gap">
        <mdui-card
          variant={proposals ? "outlined" : "filled"}
          style={{ width: "100%", padding: "20px" }}
          clickable
          onClick={() => setProposals(false)}
        >
          <div
            className="mdui-prose"
            style={{ width: "100%", userSelect: "none" }}
          >
            <div
              style={{
                display: "flex",
                textWrap: "nowrap",
                gap: "10px",
              }}
            >
              <h2>Optionen anlegen</h2>
              <mdui-icon name="add"></mdui-icon>
            </div>
            Legen Sie die Optionen manuell an.
          </div>
        </mdui-card>
        <mdui-card
          variant={proposals ? "filled" : "outlined"}
          style={{ width: "100%", padding: "20px" }}
          clickable
          onClick={() => setProposals(true)}
        >
          <div
            className="mdui-prose"
            style={{ width: "100%", userSelect: "none" }}
          >
            <div
              style={{
                display: "flex",
                textWrap: "nowrap",
                gap: "10px",
              }}
            >
              <h2>Link teilen</h2>
              <mdui-icon name="share"></mdui-icon>
            </div>
            Lassen Sie die Projektanbietenden ihre Vorschläge eintragen.
          </div>
        </mdui-card>
      </div>

      <p />
      {!proposals && (
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
                key={i}
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
              value={optionDescription}
              onInput={(e) => setOptionDescription(e.target.value)}
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
      )}
    </div>
  );
}

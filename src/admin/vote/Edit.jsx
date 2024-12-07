import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { useLoaderData } from "react-router-dom";
import { db } from "../../firebase";

import _ from "lodash";

import { snackbar } from "mdui";
import React from "react";
import { useNavigate } from "react-router-dom";
import { generateRandomHash } from "../utils";

export default function Edit() {
  const { vote, options: loadedOptions } = useLoaderData();

  const [title, setTitle] = React.useState(vote.title);
  const [description, setDescription] = React.useState(vote.description);
  const [selectCount, setSelectCount] = React.useState(vote.selectCount);

  const [extraFields, setExtraFields] = React.useState(vote.extraFields || []);

  const [options, setOptions] = React.useState(loadedOptions);

  const [name, setName] = React.useState("");
  const [teacher, setTeacher] = React.useState("");
  const [optionDescription, setOptionDescription] = React.useState("");
  const [max, setMax] = React.useState();
  const [optionId, setOptionId] = React.useState(generateRandomHash(20));

  const navigate = useNavigate();

  function addOption() {
    setOptions((options) => [
      ...options,
      {
        title: name,
        max: max,
        teacher: teacher,
        description: optionDescription,
        id: optionId,
      },
    ]);
    setName("");
    setTeacher("");
    setOptionDescription("");
    setMax("");
    setOptionId(generateRandomHash(20));
  }

  function editOption(index) {
    setName(options[index].title);
    setTeacher(options[index].teacher);
    setOptionDescription(options[index].description);
    setMax(options[index].max);
    setOptionId(options[index].id);
    setOptions((options) => options.filter((_, i) => i !== index));
  }

  async function update() {
    try {
      console.log("Publishing vote with id: " + vote.id);

      await setDoc(
        doc(db, "/votes", vote.id),
        {
          title,
          description: description || "",
        },
        { merge: true }
      );
      const optionsPromises = options.map(async (e) => {
        return setDoc(doc(db, `/votes/${vote.id}/options/${e.id}`), {
          title: e.title,
          max: e.max,
          teacher: e.teacher,
          description: e.description,
        });
      });

      await Promise.all(optionsPromises);

      console.log("Vote created successfully.");

      snackbar({
        message: "Wahl erfolgreich erstellt.",
        timeout: 5000,
      });

      navigate(`/admin/${vote.id}`);
    } catch (error) {
      console.error("Failed to update vote:", error);
      snackbar({
        message: "Fehler beim Aktualisieren der Wahl.",
        timeout: 5000,
      });
    }
  }

  const isVoteUnchanged = () => {
    const newVote = {
      title,
      description,
      selectCount,
      version: 3,
      extraFields: extraFields.length > 0 ? extraFields : undefined,
    };

    // check if vote has changed
    const changes = _.reduce(
      newVote,
      function (result, value, key) {
        if (!_.isEqual(value, vote[key])) {
          result[key] = [vote[key], value];
        }
        return result;
      },
      {}
    );

    if (!_.isEmpty(changes)) {
      // log the changes
      console.log("Vote has changed", changes);

      return false;
    }

    // check if options have changed
    if (options.length !== loadedOptions.length) {
      return false;
    }

    for (let i = 0; i < options.length; i++) {
      const changes = _.reduce(
        options[i],
        function (result, value, key) {
          const loadedOption = loadedOptions.find(
            (opt) => opt.id === options[i].id
          );
          if (!_.isEqual(value, loadedOption[key])) {
            result[key] = [loadedOption[key], value];
          }
          return result;
        },
        {}
      );

      if (!_.isEmpty(changes)) {
        // log the changes
        console.log("Option has changed", changes);

        return false;
      }
    }

    return true;
  };

  const submitDisabled = () => {
    if (!title || !selectCount || options.length === 0 || isVoteUnchanged()) {
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
      <h2>Bearbeiten</h2>
      <p></p>
      <mdui-card
        variant="filled"
        style={{ width: "100%", padding: "20px" }}
        clickable
        onClick={() => {
          navigate("../schedule");
        }}
      >
        <div
          className="mdui-prose"
          style={{ width: "100%", userSelect: "none" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div style={{ gap: "10px", textWrap: "nowrap", display: "flex" }}>
              <h2 style={{ marginBottom: "0px" }}>Zeitplan ändern</h2>
              <mdui-icon name="scheduled"></mdui-icon>
            </div>
          </div>
        </div>
      </mdui-card>

      <p />
      <mdui-divider />
      <p></p>
      <div className="button-container">
        <div></div>
        {submitDisabled() ? (
          <mdui-button disabled end-icon="publish">
            Aktualisieren
          </mdui-button>
        ) : (
          <mdui-button onClick={update} end-icon="publish">
            Aktualisieren
          </mdui-button>
        )}
      </div>
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
      <p />
      {extraFields.map((e, i) => (
        {extraFields.map((e, i) => (
          <React.Fragment key={i}>
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
          </React.Fragment>
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
          disabled
          variant="text"
          end-icon="expand_more"
        >
          Erweitert
        </mdui-button>
      </div>

      <p />
      <mdui-divider></mdui-divider>
      <p />
      <mdui-card variant="filled" style={{ width: "100%", padding: "20px" }}>
        <div className="mdui-prose">
          Bitte beachten Sie: das Löschen von Optionen kann zum Absturz des
          Dashboards führen, wenn SchülerInnen diese Option bereits gewählt
          haben. Überprüfen Sie vor dem Aktualisieren der Daten, ob alle
          Optionen noch vorhanden sind.
        </div>
      </mdui-card>
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
          {options
            .sort((a, b) => a.id.localeCompare(b.id))
            .map((e, i) => (
              <mdui-card
                key={e.id}
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
            onInput={(e) => setMax(Number(e.target.value))}
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
      <p />
    </div>
  );
}

Edit.loader = async function loader({ params }) {
  const { id } = params;
  const vote = await getDoc(doc(db, `/votes/${id}`));
  const voteData = { id, ...vote.data() };
  const options = await getDocs(collection(db, `/votes/${id}/options`));
  const optionData = options.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return {
    vote: voteData,
    options: optionData,
  };
};

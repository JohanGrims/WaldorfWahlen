import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { useLoaderData, useRevalidator } from "react-router-dom";
import { db } from "../../firebase";

import { confirm, snackbar } from "mdui";
import React from "react";
import { useNavigate } from "react-router-dom";
import { deepEqual, generateRandomHash } from "../utils";
import { re } from "mathjs";

// Component to handle individual propose field with proper switch ref handling
function ProposeFieldCard({
  field,
  index,
  editProposeField,
  removeProposeField,
}) {
  const switchRef = React.useRef(null);

  React.useEffect(() => {
    if (switchRef.current) {
      // Set initial checked state
      switchRef.current.checked = field.required;

      const handleToggle = () => {
        editProposeField(index, { required: switchRef.current.checked });
      };

      switchRef.current.addEventListener("change", handleToggle);

      // Cleanup
      return () => {
        if (switchRef.current) {
          switchRef.current.removeEventListener("change", handleToggle);
        }
      };
    }
  }, [field.required, index, editProposeField]);

  return (
    <div
      style={{
        border: "1px solid var(--mdui-color-outline)",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "16px",
      }}
    >
      <div className="fields-row">
        <mdui-text-field
          label="Feld-Label"
          value={field.label}
          onInput={(e) => editProposeField(index, { label: e.target.value })}
          placeholder="z.B. Telefonnummer"
        />
        <mdui-select
          label="Feldtyp"
          value={field.type}
          onChange={(e) => editProposeField(index, { type: e.target.value })}
        >
          <mdui-menu-item value="text">Text (kurz)</mdui-menu-item>
          <mdui-menu-item value="textarea">Text (lang)</mdui-menu-item>
          <mdui-menu-item value="number">Zahl</mdui-menu-item>
          <mdui-menu-item value="email">E-Mail</mdui-menu-item>
          <mdui-menu-item value="tel">Telefon</mdui-menu-item>
        </mdui-select>
      </div>

      <div className="fields-row">
        <mdui-text-field
          label="Platzhalter"
          value={field.placeholder}
          onInput={(e) =>
            editProposeField(index, { placeholder: e.target.value })
          }
          placeholder={
            field.type === "email" ? "beispiel@mail.com" :
            field.type === "tel" ? "+49 123 456789" :
            field.type === "number" ? "42" :
            field.type === "textarea" ? "Längerer Text..." :
            "Kurzer Text"
          }
        />
        <mdui-text-field
          label="Max. Länge"
          type="number"
          value={field.maxLength}
          onInput={(e) =>
            editProposeField(index, {
              maxLength: parseInt(e.target.value) || (field.type === "textarea" ? 500 : 50),
            })
          }
          min={1}
          max={field.type === "textarea" ? 2000 : 500}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <mdui-switch
            ref={switchRef}
            checked={field.required}
          ></mdui-switch>
          <span>Pflichtfeld</span>
        </div>
        <mdui-button-icon
          icon="delete"
          onClick={() => removeProposeField(index)}
          style={{ color: "var(--mdui-color-error)" }}
        />
      </div>
    </div>
  );
}

export default function Edit() {
  const {
    vote,
    options: loadedOptions,
    proposals: loadedProposals,
  } = useLoaderData();

  const [title, setTitle] = React.useState(vote.title);
  const [description, setDescription] = React.useState(vote.description);
  const [selectCount] = React.useState(vote.selectCount);

  const [extraFields, setExtraFields] = React.useState(vote.extraFields || []);

  // Proposal fields and dialog texts
  const [proposeFields, setProposeFields] = React.useState(
    vote.proposeFields || []
  );
  const [proposeTexts, setProposeTexts] = React.useState(
    vote.proposeTexts || {
      welcomeHeadline: "Vorschlag einreichen",
      welcomeDescription:
        "Sie sind dabei, einen Vorschlag für ein Projekt einzureichen. Vielen Dank! Das erleichtert den Administratoren die Übersicht über die Daten und stellt sicher, dass alles so ist, wie es sein soll. Bitte stellen Sie sicher, dass Sie die Felder so ausfüllen, wie sie am Ende aussehen sollen. Unten sehen Sie eine Vorschau Ihres Projekts. Die Zeichenlimits sind layoutbedingt und können nicht überschritten werden.",
      hintHeadline: "Hinweis",
      hintDescription:
        "Der Titel sollte kurz und prägnant sein. Die Beschreibung sollte das Projekt gut umreißen und eventuelle Beschränkungen erwähnen. Tragen Sie die maximale Anzahl an SchülerInnen so ein, wie es bei der Anmeldung abgesprochen wurde. Alle Vorschläge werden manuell von den Administratoren geprüft und freigeschaltet.",
    }
  );

  const [options, setOptions] = React.useState(loadedOptions);
  const [proposals, setProposals] = React.useState(loadedProposals);

  // Calculate total max value from all options
  const [totalMax, setTotalMax] = React.useState(() =>
    loadedOptions.reduce((sum, option) => sum + (parseInt(option.max) || 0), 0)
  );

  const [name, setName] = React.useState("");
  const [teacher, setTeacher] = React.useState("");
  const [optionDescription, setOptionDescription] = React.useState("");
  const [max, setMax] = React.useState();
  const [optionId, setOptionId] = React.useState(generateRandomHash(20));

  const [proposeTextsCardOpen, setProposeTextsCardOpen] = React.useState(false);
  const [proposeFieldsCardOpen, setProposeFieldsCardOpen] =
    React.useState(false);

  const navigate = useNavigate();
  const revalidator = useRevalidator();

  function addOption() {
    const newOptions = [
      ...options,
      {
        title: name,
        max: max,
        teacher: teacher,
        description: optionDescription,
        id: optionId,
      },
    ];
    setOptions(newOptions);
    // Update total max value
    setTotalMax(
      newOptions.reduce((sum, option) => sum + (parseInt(option.max) || 0), 0)
    );
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
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    // Update total max when removing an option during edit
    setTotalMax(
      newOptions.reduce((sum, option) => sum + (parseInt(option.max) || 0), 0)
    );
  }

  async function update() {
    try {
      await setDoc(
        doc(db, "/votes", vote.id),
        {
          title,
          description: description || "",
          extraFields: extraFields.length > 0 ? extraFields : [],
          proposeFields: vote.proposals ? proposeFields : [],
          proposeTexts: vote.proposals ? proposeTexts : {},
        },
        { merge: true }
      );
      const removedOptions = loadedOptions.filter(
        (loaded) => !options.some((current) => current.id === loaded.id)
      );
      removedOptions.map((opt) =>
        confirm({
          icon: "delete",
          headline: "Option löschen",
          description: `Sind Sie sicher, dass Sie die Option "${opt.title}" löschen möchten? Wenn SchülerInnen diese Option bereits gewählt haben, kann das Dashboard abstürzen.`,
          cancelText: "Abbrechen",
          confirmText: "Trotzdem löschen",
          onConfirm: async () => {
            await deleteDoc(doc(db, `/votes/${vote.id}/options/${opt.id}`));
          },
        })
      );
      const optionsPromises = options.map(async (e) => {
        return setDoc(doc(db, `/votes/${vote.id}/options/${e.id}`), {
          title: e.title,
          max: e.max,
          teacher: e.teacher,
          description: e.description,
        });
      });

      await Promise.all([...optionsPromises]);

      snackbar({
        message: "Wahl erfolgreich aktualisiert.",
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
      extraFields: extraFields.length > 0 ? extraFields : [],
      proposeFields: vote.proposals ? proposeFields : [],
      proposeTexts: vote.proposals ? proposeTexts : {},
    };

    const changes = Object.keys(newVote).reduce((result, key) => {
      if (!deepEqual(newVote[key], vote[key])) {
        result[key] = [vote[key], newVote[key]];
      }
      return result;
    }, {});

    if (Object.keys(changes).length > 0) {
      // log the changes
      console.info("Vote has changed", changes);
      return false;
    }

    // check if options have changed
    if (options.length !== loadedOptions.length) {
      return false;
    }

    for (let i = 0; i < options.length; i++) {
      const changes = Object.keys(options[i]).reduce((result, key) => {
        const loadedOption = loadedOptions.find(
          (opt) => opt.id === options[i].id
        );
        if (!deepEqual(options[i][key], loadedOption[key])) {
          result[key] = [loadedOption[key], options[i][key]];
        }
        return result;
      }, {});

      if (Object.keys(changes).length > 0) {
        console.info("Option has changed", changes);
        return false;
      }
    }

    return true;
  };

  const submitDisabled = () => {
    if (!title || !selectCount || isVoteUnchanged()) {
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

  function addProposeField() {
    setProposeFields([
      ...proposeFields,
      {
        id: generateRandomHash(10),
        label: "",
        type: "text",
        required: false,
        maxLength: 50,
        placeholder: "",
      },
    ]);
  }

  function editProposeField(index, field) {
    const newFields = [...proposeFields];
    const updatedField = { ...newFields[index], ...field };

    // Auto-adjust maxLength when type changes
    if (field.type && field.type !== newFields[index].type) {
      if (field.type === "textarea" && updatedField.maxLength <= 100) {
        updatedField.maxLength = 500;
      } else if (field.type !== "textarea" && updatedField.maxLength > 500) {
        updatedField.maxLength = 50;
      }
    }

    newFields[index] = updatedField;
    setProposeFields(newFields);
  }

  function removeProposeField(index) {
    setProposeFields(proposeFields.filter((_, i) => i !== index));
  }

  async function deleteProposal(proposal) {
    confirm({
      icon: "delete",
      headline: "Vorschlag löschen",
      description: `Sind Sie sicher, dass Sie den Vorschlag "${proposal.name}" löschen möchten?`,
      cancelText: "Abbrechen",
      confirmText: "Löschen",
      onConfirm: async () => {
        try {
          await deleteDoc(
            doc(db, `/votes/${vote.id}/proposals/${proposal.id}`)
          );
          setProposals((proposals) =>
            proposals.filter((p) => p.id !== proposal.id)
          );
          snackbar({
            message: "Vorschlag erfolgreich gelöscht.",
            timeout: 5000,
          });
        } catch (error) {
          console.error("Failed to delete proposal:", error);
          snackbar({
            message: "Fehler beim Löschen des Vorschlags.",
            timeout: 5000,
          });
        }
      },
    });
  }

  return (
    <div className="mdui-prose">
      <h2
        style={{
          margin: "0px",
        }}
      >
        Bearbeiten
      </h2>

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
          {isVoteUnchanged() ? "keine Änderungen" : "neue Änderungen"} an der
          Wahl "{vote.title}" ({vote.id})
        </div>
        <div>
          {isVoteUnchanged() ? (
            <mdui-button-icon icon="replay" disabled></mdui-button-icon>
          ) : (
            <mdui-button-icon
              icon="replay"
              onClick={() => {
                confirm({
                  icon: "replay",
                  headline: "Änderungen verwerfen",
                  description:
                    "Sind Sie sicher, dass Sie alle Änderungen verwerfen möchten? Alle ungespeicherten Änderungen gehen verloren.",
                  cancelText: "Abbrechen",
                  confirmText: "Verwerfen",
                  onConfirm: () => {
                    setTitle(vote.title);
                    setDescription(vote.description);
                    setExtraFields(vote.extraFields || []);
                    setProposeFields(vote.proposeFields || []);
                    setProposeTexts(
                      vote.proposeTexts || {
                        welcomeHeadline: "Vorschlag einreichen",
                        welcomeDescription:
                          "Sie sind dabei, einen Vorschlag für ein Projekt einzureichen. Vielen Dank! Das erleichtert den Administratoren die Übersicht über die Daten und stellt sicher, dass alles so ist, wie es sein soll. Bitte stellen Sie sicher, dass Sie die Felder so ausfüllen, wie sie am Ende aussehen sollen. Unten sehen Sie eine Vorschau Ihres Projekts. Die Zeichenlimits sind layoutbedingt und können nicht überschritten werden.",
                        hintHeadline: "Hinweis",
                        hintDescription:
                          "Der Titel sollte kurz und prägnant sein. Die Beschreibung sollte das Projekt gut umreißen und eventuelle Beschränkungen erwähnen. Tragen Sie die maximale Anzahl an SchülerInnen so ein, wie es bei der Anmeldung abgesprochen wurde. Alle Vorschläge werden manuell von den Administratoren geprüft und freigeschaltet.",
                      }
                    );
                    setOptions(loadedOptions);
                    setTotalMax(
                      loadedOptions.reduce(
                        (sum, option) => sum + (parseInt(option.max) || 0),
                        0
                      )
                    );
                    setProposals(loadedProposals);
                    setName("");
                    setTeacher("");
                    setOptionDescription("");
                    setMax("");
                    setOptionId(generateRandomHash(20));
                    revalidator.revalidate();
                  },
                });
              }}
            ></mdui-button-icon>
          )}
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
      </mdui-card>
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

      {/* Proposal Fields and Dialog Text Management - only show if proposals are enabled */}
      {vote.proposals && (
        <>
          <mdui-card
            variant="filled"
            style={{ width: "100%", padding: "20px", marginBottom: "20px" }}
          >
            {proposeTextsCardOpen ? (
              <mdui-button-icon
                icon="expand_less"
                onClick={() => setProposeTextsCardOpen(false)}
              />
            ) : (
              <mdui-button-icon
                icon="expand_more"
                onClick={() => setProposeTextsCardOpen(true)}
              />
            )}

            <div className="mdui-prose">
              <h3>Dialog-Texte für Vorschlagsseite</h3>

              {proposeTextsCardOpen && (
                <>
                  <p>
                    Passen Sie die Texte in den Dialogen auf der Vorschlagsseite
                    an.
                  </p>

                  <mdui-text-field
                    label="Willkommen-Überschrift"
                    value={proposeTexts.welcomeHeadline}
                    onInput={(e) =>
                      setProposeTexts({
                        ...proposeTexts,
                        welcomeHeadline: e.target.value,
                      })
                    }
                    maxlength={50}
                    counter
                  />
                  <mdui-text-field
                    label="Willkommen-Beschreibung"
                    rows={3}
                    value={proposeTexts.welcomeDescription}
                    onInput={(e) =>
                      setProposeTexts({
                        ...proposeTexts,
                        welcomeDescription: e.target.value,
                      })
                    }
                    maxlength={500}
                    counter
                  />
                  <mdui-text-field
                    label="Hinweis-Überschrift"
                    value={proposeTexts.hintHeadline}
                    onInput={(e) =>
                      setProposeTexts({
                        ...proposeTexts,
                        hintHeadline: e.target.value,
                      })
                    }
                    maxlength={50}
                    counter
                  />
                  <mdui-text-field
                    label="Hinweis-Beschreibung"
                    rows={3}
                    value={proposeTexts.hintDescription}
                    onInput={(e) =>
                      setProposeTexts({
                        ...proposeTexts,
                        hintDescription: e.target.value,
                      })
                    }
                    maxlength={500}
                    counter
                  />
                </>
              )}
            </div>
          </mdui-card>

          <mdui-card
            variant="filled"
            style={{ width: "100%", padding: "20px", marginBottom: "20px" }}
          >
            {proposeFieldsCardOpen ? (
              <mdui-button-icon
                icon="expand_less"
                onClick={() => setProposeFieldsCardOpen(false)}
              />
            ) : (
              <mdui-button-icon
                icon="expand_more"
                onClick={() => setProposeFieldsCardOpen(true)}
              />
            )}
            <div className="mdui-prose">
              <h3>Zusätzliche Felder für Vorschläge</h3>

              {proposeFieldsCardOpen && (
                <>
                  <p>
                    Verwalten Sie zusätzliche Felder, die beim Einreichen von
                    Vorschlägen ausgefüllt werden sollen.
                  </p>

                  {proposeFields.map((field, index) => (
                    <ProposeFieldCard
                      key={field.id}
                      field={field}
                      index={index}
                      editProposeField={editProposeField}
                      removeProposeField={removeProposeField}
                    />
                  ))}

                  <mdui-button
                    icon="add"
                    variant="outlined"
                    onClick={addProposeField}
                    style={{ width: "100%" }}
                  >
                    Neues Feld hinzufügen
                  </mdui-button>
                </>
              )}
            </div>
          </mdui-card>
        </>
      )}

      {(proposals.length > 0 || options.length === 0) && (
        <mdui-card variant="filled" style={{ width: "100%", padding: "20px" }}>
          <div className="mdui-prose">
            <h2>Vorschläge</h2>
            <div className="description">
              Hier sind die Vorschläge, die von den Projektanbietenden
              eingereicht wurden. Klicken Sie auf einen Vorschlag, um ihn zu
              bearbeiten und zu den Optionen hinzuzufügen. Sie können auch
              Vorschläge löschen, indem Sie auf das Löschsymbol klicken. Teilen
              Sie den Link https://waldorfwahlen.web.app/p/{vote.id} mit den
              Projektanbietenden für Vorschläge.
            </div>

            <p />
            {proposals
              .sort((a, b) => a.id.localeCompare(b.id))
              .map((e, i) => (
                <mdui-card
                  key={e.id}
                  class="option-preview"
                  clickable
                  disabled={
                    options.some((option) => option.id === e.id) ||
                    options.some((option) => option.title === e.name)
                  }
                  style={{
                    cursor: "pointer",
                    marginBottom: "5px",
                  }}
                  variant={"outlined"}
                  onClick={() => {
                    setName(e.name);
                    setTeacher(e.teacher);
                    setOptionDescription(e.description);
                    setMax(e.max);
                    setOptionId(e.id);

                    document
                      .querySelector("#add-option-button")
                      .scrollIntoView({
                        behavior: "smooth",
                      });
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <b>
                        {e.name} <i>(#{e.id})</i>
                      </b>
                      <div className="teacher">{e.teacher}</div>
                      <div className="description">{e.description}</div>
                      <div className="max">max. {e.max} SchülerInnen</div>

                      {/* Display custom field data */}
                      {e.customFields &&
                        vote.proposeFields &&
                        Object.keys(e.customFields).length > 0 && (
                          <div
                            style={{
                              marginTop: "8px",
                              padding: "8px",
                              backgroundColor: "rgba(0,0,0,0.05)",
                              borderRadius: "4px",
                            }}
                          >
                            <small>
                              <strong>Zusätzliche Angaben:</strong>
                            </small>
                            {vote.proposeFields.map(
                              (field) =>
                                e.customFields[field.id] && (
                                  <div
                                    key={field.id}
                                    style={{
                                      fontSize: "0.9em",
                                      marginTop: "2px",
                                    }}
                                  >
                                    <strong>{field.label}:</strong>{" "}
                                    {e.customFields[field.id]}
                                  </div>
                                )
                            )}
                          </div>
                        )}
                    </div>
                    <mdui-tooltip content="Vorschlag löschen">
                      <mdui-button-icon
                        icon="delete"
                        style={{ color: "var(--mdui-color-error)" }}
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteProposal(e);
                        }}
                      />
                    </mdui-tooltip>
                  </div>
                </mdui-card>
              ))}
          </div>
        </mdui-card>
      )}

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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
              backgroundColor: "var(--mdui-color-surface-container-high)",
              padding: "10px",
              borderRadius: "8px",
              fontWeight: "bold",
            }}
          >
            <div>Optionen: {options.length}</div>
            <div>Gesamt max. Plätze: {totalMax}</div>
          </div>
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <b>
                      {e.title} <i>(#{e.id})</i>
                    </b>
                    <div className="teacher">{e.teacher}</div>
                    <div className="description">{e.description}</div>
                    <div className="max">max. {e.max} SchülerInnen</div>
                  </div>
                  <mdui-tooltip content="Vorschlag löschen">
                    <mdui-button-icon
                      icon="delete"
                      style={{ color: "var(--mdui-color-error)" }}
                      onClick={(event) => {
                        event.stopPropagation();
                        setOptions((prevOptions) => {
                          const newOptions = prevOptions.filter(
                            (option) => option.id !== e.id
                          );
                          // Update total max when removing an option
                          setTotalMax(
                            newOptions.reduce(
                              (sum, option) =>
                                sum + (parseInt(option.max) || 0),
                              0
                            )
                          );
                          return newOptions;
                        });
                        snackbar({
                          message: `Option "${e.title}" wurde gelöscht.`,
                          timeout: 5000,
                          action: "Änderungen verwerfen",
                          onActionClick: () => {
                            setOptions(loadedOptions);
                            setTotalMax(
                              loadedOptions.reduce(
                                (sum, option) =>
                                  sum + (parseInt(option.max) || 0),
                                0
                              )
                            );
                            revalidator.revalidate();
                          },
                        });
                      }}
                    />
                  </mdui-tooltip>
                </div>
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
          <div className="fields-row">
            <mdui-button
              full-width
              variant="outlined"
              icon="refresh"
              onClick={() => {
                setName("");
                setTeacher("");
                setOptionDescription("");
                setMax("");
                setOptionId(generateRandomHash(20));
              }}
            >
              Zurücksetzen
            </mdui-button>
            {addOptionDisabled() ? (
              <mdui-button
                full-width
                variant="tonal"
                icon="add"
                onClick={addOption}
                disabled
                id="add-option-button"
              >
                Hinzufügen
              </mdui-button>
            ) : (
              <mdui-button
                full-width
                variant="tonal"
                icon="add"
                onClick={addOption}
                id="add-option-button"
              >
                Hinzufügen
              </mdui-button>
            )}
          </div>
        </div>
      </div>
      <p />
    </div>
  );
}

Edit.loader = async function loader({ params }) {
  try {
    const { id } = params;
    const vote = await getDoc(doc(db, `/votes/${id}`));

    if (!vote.exists()) {
      throw new Error(`Vote with id ${id} not found`);
    }

    const voteData = { id, ...vote.data() };
    const options = await getDocs(collection(db, `/votes/${id}/options`));
    const optionData = options.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const proposals = await getDocs(collection(db, `/votes/${id}/proposals`));
    const proposalData = proposals.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      vote: voteData,
      options: optionData,
      proposals: proposalData,
    };
  } catch (error) {
    console.error("Failed to load vote:", error);
    throw error;
  }
};

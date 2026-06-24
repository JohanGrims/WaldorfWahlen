import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  DocumentData,
} from "firebase/firestore";
import { formatGrades } from "../../utils/format";
import {
  LoaderFunctionArgs,
  useLoaderData,
  useRevalidator,
} from "react-router-dom";
import { db } from "../../firebase";

import { confirm, snackbar } from "mdui";
import React from "react";
import { useNavigate } from "react-router-dom";
import { deepEqual, generateRandomHash } from "../utils";

interface ProposeField {
  id: string;
  label: string;
  type: "text" | "textarea" | "number" | "email" | "tel";
  required: boolean;
  maxLength: number;
  placeholder: string;
}

interface ProposeTexts {
  welcomeHeadline: string;
  welcomeDescription: string;
  hintHeadline: string;
  hintDescription: string;
}

interface OptionData {
  id: string;
  title: string;
  teacher: string;
  description: string;
  max: number;
  leaders?: string[];
  allowedGrades?: number[];
}

interface ProposalData {
  id: string;
  name: string;
  teacher: string;
  description: string;
  max: number;
  customFields?: Record<string, string>;
}

interface VoteData extends DocumentData {
  id: string;
  title: string;
  description: string;
  selectCount: number;
  extraFields?: string[];
  proposals: boolean;
  proposeFields?: ProposeField[];
  proposeTexts?: ProposeTexts;
  allowedGrades?: number[];
}

interface LoaderData {
  vote: VoteData;
  options: OptionData[];
  proposals: ProposalData[];
  classes: any[];
}

interface ProposeFieldCardProps {
  field: ProposeField;
  index: number;
  editProposeField: (index: number, updates: Partial<ProposeField>) => void;
  removeProposeField: (index: number) => void;
}

// Component to handle individual propose field with proper switch ref handling
function ProposeFieldCard({
  field,
  index,
  editProposeField,
  removeProposeField,
}: ProposeFieldCardProps) {
  const switchRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (switchRef.current) {
      // Set initial checked state
      switchRef.current.checked = field.required;

      const handleToggle = () => {
        editProposeField(index, { required: switchRef.current!.checked });
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
          onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
            editProposeField(index, { label: e.target.value })
          }
          placeholder="z.B. Telefonnummer"
        />
        <mdui-select
          label="Feldtyp"
          value={field.type}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            editProposeField(index, {
              type: e.target.value as ProposeField["type"],
            })
          }
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
          onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
            editProposeField(index, { placeholder: e.target.value })
          }
          placeholder={
            field.type === "email"
              ? "beispiel@mail.com"
              : field.type === "tel"
              ? "+49 123 456789"
              : field.type === "number"
              ? "42"
              : field.type === "textarea"
              ? "Längerer Text..."
              : "Kurzer Text"
          }
        />
        <mdui-text-field
          label="Max. Länge"
          type="number"
          value={String(field.maxLength)}
          onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
            editProposeField(index, {
              maxLength:
                parseInt(e.target.value) ||
                (field.type === "textarea" ? 500 : 50),
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
          <mdui-switch ref={switchRef} checked={field.required}></mdui-switch>
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
    classes,
  } = useLoaderData() as LoaderData;

  const [title, setTitle] = React.useState<string>(vote.title);
  const [description, setDescription] = React.useState<string>(
    vote.description
  );
  const [selectCount] = React.useState<number>(vote.selectCount);

  const [extraFields, setExtraFields] = React.useState<string[]>(
    vote.extraFields || []
  );

  // Proposal fields and dialog texts
  const [proposeFields, setProposeFields] = React.useState<ProposeField[]>(
    vote.proposeFields || []
  );
  const [proposeTexts, setProposeTexts] = React.useState<ProposeTexts>(
    vote.proposeTexts || {
      welcomeHeadline: "Vorschlag einreichen",
      welcomeDescription:
        "Sie sind dabei, einen Vorschlag für ein Projekt einzureichen. Vielen Dank! Das erleichtert den Administratoren die Übersicht über die Daten und stellt sicher, dass alles so ist, wie es sein soll. Bitte stellen Sie sicher, dass Sie die Felder so ausfüllen, wie sie am Ende aussehen sollen. Unten sehen Sie eine Vorschau Ihres Projekts. Die Zeichenlimits sind layoutbedingt und können nicht überschritten werden.",
      hintHeadline: "Hinweis",
      hintDescription:
        "Der Titel sollte kurz und prägnant sein. Die Beschreibung sollte das Projekt gut umreißen und eventuelle Beschränkungen erwähnen. Tragen Sie die maximale Anzahl an SchülerInnen so ein, wie es bei der Anmeldung abgesprochen wurde. Alle Vorschläge werden manuell von den Administratoren geprüft und freigeschaltet.",
    }
  );

  const [voteAllowedGrades, setVoteAllowedGrades] = React.useState<number[]>(
    vote.allowedGrades || []
  );

  const [options, setOptions] = React.useState<OptionData[]>(loadedOptions);
  const [proposals, setProposals] =
    React.useState<ProposalData[]>(loadedProposals);

  // Calculate total max value from all options
  const [totalMax, setTotalMax] = React.useState<number>(() =>
    loadedOptions.reduce((sum, option) => sum + (Number(option.max) || 0), 0)
  );

  const [name, setName] = React.useState<string>("");
  const [teacher, setTeacher] = React.useState<string>("");
  const [optionDescription, setOptionDescription] = React.useState<string>("");
  const [max, setMax] = React.useState<number | undefined>(undefined);
  const [optionId, setOptionId] = React.useState<string>(
    generateRandomHash(20)
  );
  const [leaders, setLeaders] = React.useState<string[]>([]);
  const [optionAllowedGrades, setOptionAllowedGrades] = React.useState<number[]>([]);
  const [leaderSearchQuery, setLeaderSearchQuery] = React.useState<string>("");

  const toggleLeader = (classGrade: number, listIndex: string | number) => {
    const key = `${classGrade}-${listIndex}`;
    setLeaders((prev) =>
      prev.includes(key) ? prev.filter((l) => l !== key) : [...prev, key]
    );
  };

  const [activeTab, setActiveTab] = React.useState<string>("general");
  const [optionDialogOpen, setOptionDialogOpen] = React.useState(false);
  const [editingOptionIndex, setEditingOptionIndex] = React.useState<number | null>(null);

  const [proposeTextsCardOpen, setProposeTextsCardOpen] =
    React.useState<boolean>(false);
  const [proposeFieldsCardOpen, setProposeFieldsCardOpen] =
    React.useState<boolean>(false);

  const navigate = useNavigate();
  const revalidator = useRevalidator();

  function openNewOptionDialog() {
    setEditingOptionIndex(null);
    setName("");
    setTeacher("");
    setOptionDescription("");
    setMax(undefined);
    setOptionId(generateRandomHash(20));
    setLeaders([]);
    setOptionAllowedGrades([]);
    setOptionDialogOpen(true);
  }

  function openEditOptionDialog(index: number) {
    setEditingOptionIndex(index);
    setName(options[index].title);
    setTeacher(options[index].teacher);
    setOptionDescription(options[index].description);
    setMax(options[index].max);
    setOptionId(options[index].id);
    setLeaders(options[index].leaders || []);
    setOptionAllowedGrades(options[index].allowedGrades || []);
    setOptionDialogOpen(true);
  }

  function saveOption() {
    if (name && max !== undefined) {
      let newOptions: OptionData[];
      if (editingOptionIndex !== null) {
        newOptions = [...options];
        newOptions[editingOptionIndex] = {
          title: name,
          max: max,
          teacher: teacher,
          description: optionDescription,
          id: optionId,
          leaders: leaders,
          allowedGrades: optionAllowedGrades,
        };
      } else {
        newOptions = [
          ...options,
          {
            title: name,
            max: max,
            teacher: teacher,
            description: optionDescription,
            id: optionId,
            leaders: leaders,
            allowedGrades: optionAllowedGrades,
          },
        ];
      }
      setOptions(newOptions);
      setTotalMax(newOptions.reduce((sum, option) => sum + (option.max || 0), 0));
      setOptionDialogOpen(false);
    }
  }

  function deleteOption(index: number) {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    setTotalMax(newOptions.reduce((sum, option) => sum + (option.max || 0), 0));
  }

  async function update() {
    try {
      await setDoc(
        doc(db, "schools/SCHOOLID/votes", vote.id),
        {
          title,
          description: description || "",
          extraFields: extraFields.length > 0 ? extraFields : [],
          proposeFields: vote.proposals ? proposeFields : [],
          proposeTexts: vote.proposals ? proposeTexts : {},
          allowedGrades: voteAllowedGrades,
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
            await deleteDoc(
              doc(db, `schools/SCHOOLID/votes/${vote.id}/options/${opt.id}`)
            );
          },
        })
      );
      const optionsPromises = options.map(async (e) => {
        return setDoc(
          doc(db, `schools/SCHOOLID/votes/${vote.id}/options/${e.id}`),
          {
            title: e.title,
            max: e.max,
            teacher: e.teacher,
            description: e.description,
            leaders: e.leaders || [],
            allowedGrades: e.allowedGrades || [],
          }
        );
      });

      await Promise.all([...optionsPromises]);

      snackbar({
        message: "Wahl erfolgreich aktualisiert.",
        autoCloseDelay: 5000,
      });

      navigate(`/admin/${vote.id}`);
    } catch (error) {
      console.error("Failed to update vote:", error);
      snackbar({
        message: "Fehler beim Aktualisieren der Wahl.",
        autoCloseDelay: 5000,
      });
    }
  }

  const isVoteUnchanged = (): boolean => {
    const newVote = {
      title,
      description,
      selectCount,
      version: 3,
      extraFields: extraFields.length > 0 ? extraFields : [],
      proposeFields: vote.proposals ? proposeFields : [],
      proposeTexts: vote.proposals ? proposeTexts : {},
      allowedGrades: voteAllowedGrades.length > 0 ? voteAllowedGrades : undefined,
    };

    const changes = Object.keys(newVote).reduce(
      (result: Record<string, any[]>, key: string) => {
        const typedKey = key as keyof typeof newVote;
        if (!deepEqual(newVote[typedKey], vote[typedKey])) {
          result[key] = [vote[typedKey], newVote[typedKey]];
        }
        return result;
      },
      {}
    );

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
      const changes = Object.keys(options[i]).reduce(
        (result: Record<string, any[]>, key: string) => {
          const loadedOption = loadedOptions.find(
            (opt) => opt.id === options[i].id
          );
          if (
            loadedOption &&
            !deepEqual(
              options[i][key as keyof OptionData],
              loadedOption[key as keyof OptionData]
            )
          ) {
            result[key] = [
              loadedOption[key as keyof OptionData],
              options[i][key as keyof OptionData],
            ];
          }
          return result;
        },
        {} as Record<string, any[]>
      );

      if (Object.keys(changes).length > 0) {
        console.info("Option has changed", changes);
        return false;
      }
    }

    return true;
  };

  const submitDisabled = (): boolean => {
    if (!title || selectCount === undefined || isVoteUnchanged()) {
      return true;
    }

    return false;
  };

  function addOptionDisabled(): boolean {
    return !name || max === undefined;
  }

  function editExtraField(index: number, value: string) {
    const newValues = [...extraFields];
    newValues[index] = value;
    setExtraFields(newValues);
  }

  function removeExtraField(index: number) {
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

  function editProposeField(index: number, updates: Partial<ProposeField>) {
    const newFields = [...proposeFields];
    const updatedField = { ...newFields[index], ...updates };

    // Auto-adjust maxLength when type changes
    if (updates.type && updates.type !== newFields[index].type) {
      if (updates.type === "textarea" && updatedField.maxLength <= 100) {
        updatedField.maxLength = 500;
      } else if (updates.type !== "textarea" && updatedField.maxLength > 500) {
        updatedField.maxLength = 50;
      }
    }

    newFields[index] = updatedField;
    setProposeFields(newFields);
  }

  function removeProposeField(index: number) {
    setProposeFields(proposeFields.filter((_, i) => i !== index));
  }

  async function deleteProposal(proposal: ProposalData) {
    confirm({
      icon: "delete",
      headline: "Vorschlag löschen",
      description: `Sind Sie sicher, dass Sie den Vorschlag "${proposal.name}" löschen möchten?`,
      cancelText: "Abbrechen",
      confirmText: "Löschen",
      onConfirm: async () => {
        try {
          await deleteDoc(
            doc(
              db,
              `schools/SCHOOLID/votes/${vote.id}/proposals/${proposal.id}`
            )
          );
          setProposals((proposals) =>
            proposals.filter((p) => p.id !== proposal.id)
          );
          snackbar({
            message: "Vorschlag erfolgreich gelöscht.",
            autoCloseDelay: 5000,
          });
        } catch (error) {
          console.error("Failed to delete proposal:", error);
          snackbar({
            message: "Fehler beim Löschen des Vorschlags.",
            autoCloseDelay: 5000,
          });
        }
      },
    });
  }

  return (
    <div className="mdui-prose">
      <div
        style={{
          position: "sticky",
          top: "0px",
          zIndex: "1000",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 0",
          backgroundColor: "var(--mdui-color-background)",
        }}
      >
        <h2 style={{ margin: "0px" }}>Bearbeiten ({vote.id})</h2>
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
                    setVoteAllowedGrades(vote.allowedGrades || []);
                    setOptions(loadedOptions);
                    setTotalMax(
                      loadedOptions.reduce(
                        (sum, option) => sum + (option.max || 0),
                        0
                      )
                    );
                    setProposals(loadedProposals);
                    setName("");
                    setTeacher("");
                    setOptionDescription("");
                    setMax(undefined);
                    setOptionId(generateRandomHash(20));
                    setLeaders([]);
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
      </div>

      <mdui-tabs value={activeTab} onTabChange={(e: any) => setActiveTab(e.target.value)}>
        <mdui-tab value="general">Allgemein</mdui-tab>
        <mdui-tab value="options">Optionen ({options.length})</mdui-tab>
        <mdui-tab value="advanced">Erweitert</mdui-tab>

        <mdui-tab-panel slot="panel" value="general">
          <p />
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
        onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
          setTitle(e.target.value)
        }
      />
      <mdui-text-field
        label="Beschreibung (optional)"
        placeholder="In der Schülerprojektwoche vom 12. bis 16. Juli 2024 werden von SchülerInnen organisierte Projekte angeboten. Die Projekte finden täglich von 10:00 bis 15:00 in den angegebenen Räumen statt."
        rows={3}
        maxlength={200}
        counter
        value={description}
        onInput={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          setDescription(e.target.value)
        }
      ></mdui-text-field>
      </mdui-tab-panel>

      <mdui-tab-panel slot="panel" value="advanced">
        <p />

        <mdui-card variant="filled" style={{ width: "100%", padding: "20px", marginBottom: "20px" }}>
          <div className="mdui-prose">
            <h3>Klassenbeschränkung (Wahl)</h3>
            <p>
              Für welche Klassen findet diese Wahl statt? Standardmäßig für alle.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <mdui-chip
                selected={voteAllowedGrades.length === 0}
                selectable
                onClick={() => setVoteAllowedGrades([])}
              >
                Alle Klassen
              </mdui-chip>
              {Array.from(new Set(classes.map(c => c.grade))).sort((a,b)=>a-b).map((grade) => (
                <mdui-chip
                  key={grade}
                  selected={voteAllowedGrades.includes(grade)}
                  selectable
                  onClick={() => {
                    if (voteAllowedGrades.includes(grade)) {
                      setVoteAllowedGrades(voteAllowedGrades.filter(g => g !== grade));
                    } else {
                      setVoteAllowedGrades([...voteAllowedGrades, grade].sort((a,b)=>a-b));
                    }
                  }}
                >
                  Klasse {grade}
                </mdui-chip>
              ))}
            </div>
          </div>
        </mdui-card>

        <mdui-card variant="filled" style={{ width: "100%", padding: "20px", marginBottom: "20px" }}>
          <div className="mdui-prose">
            <h3>Zusätzliche Felder (Anmeldung)</h3>
            <p>
              Diese Felder werden von den SchülerInnen bei der Wahlbuchung ausgefüllt.
            </p>
            {extraFields.map((e, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <mdui-text-field
                  value={e}
                  onInput={(evt: React.ChangeEvent<HTMLInputElement>) =>
                    editExtraField(i, evt.target.value)
                  }
                  placeholder="Feldname (z.B. Telefonnummer)"
                  style={{ flex: 1 }}
                />
                <mdui-button-icon
                  icon="delete"
                  onClick={() => removeExtraField(i)}
                  style={{ color: "var(--mdui-color-error)" }}
                />
              </div>
            ))}
            <mdui-button icon="add" variant="outlined" onClick={() => setExtraFields([...extraFields, ""])}>
              Neues Feld
            </mdui-button>
          </div>
        </mdui-card>

      {/* Proposal Fields and Dialog Text Management - only show if proposals are enabled */}
      {vote.proposals && (
        <div style={{ marginTop: "20px" }}>
          <mdui-card
            variant="filled"
            style={{ width: "100%", padding: "20px", marginBottom: "20px" }}
          >
            <div className="mdui-prose">
              <h3>Dialog-Texte anpassen</h3>
              <p>
                Passen Sie die Texte in den Dialogen auf der Vorschlagsseite an.
              </p>

              <mdui-text-field
                label="Willkommen-Überschrift"
                value={proposeTexts.welcomeHeadline}
                onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
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
                onInput={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
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
                onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
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
                onInput={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setProposeTexts({
                    ...proposeTexts,
                    hintDescription: e.target.value,
                  })
                }
                maxlength={500}
                counter
              />
            </div>
          </mdui-card>

          <mdui-card
            variant="filled"
            style={{ width: "100%", padding: "20px" }}
          >
            <div className="mdui-prose">
              <h3>Zusätzliche Felder für Vorschläge</h3>
              <p>
                Fügen Sie zusätzliche Felder hinzu, die beim Einreichen von
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
            </div>
          </mdui-card>
        </div>
      )}
      </mdui-tab-panel>

      <mdui-tab-panel slot="panel" value="options">
        <p />

      {(proposals.length > 0 || options.length === 0) && (
        <mdui-card variant="filled" style={{ width: "100%", padding: "20px" }}>
          <div className="mdui-prose">
            <h2>Vorschläge</h2>
            <div className="description">
              Hier sind die Vorschläge, die von den Projektanbietenden
              eingereicht wurden. Klicken Sie auf einen Vorschlag, um ihn zu
              bearbeiten und zu den Optionen hinzuzufügen. Sie können auch
              Vorschläge löschen, indem Sie auf das Löschsymbol klicken. Teilen
              Sie den Link {window.location.origin}/p/{vote.id} mit den
              Projektanbietenden für Vorschläge.
            </div>

              {/* Already-added proposals: compact list */}
              {proposals.some(
                (e) =>
                  options.some((option) => option.id === e.id) ||
                  options.some((option) => option.title === e.name)
              ) && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
                  {proposals
                    .sort((a, b) => a.id.localeCompare(b.id))
                    .filter(
                      (e) =>
                        options.some((option) => option.id === e.id) ||
                        options.some((option) => option.title === e.name)
                    )
                    .map((e) => (
                      <div
                        key={e.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          border: "1px solid var(--mdui-color-outline-variant)",
                          opacity: 0.55,
                          gap: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                          <mdui-icon name="check_circle" style={{ color: "var(--mdui-color-primary)", fontSize: "18px", flexShrink: 0 }} />
                          <span style={{ fontSize: "0.9em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <b>{e.name}</b>
                            {e.teacher && (
                              <span style={{ color: "var(--mdui-color-on-surface-variant)", marginLeft: "6px" }}>
                                {e.teacher}
                              </span>
                            )}
                          </span>
                          <mdui-chip style={{ flexShrink: 0, fontSize: "0.75em" }}>Hinzugefügt</mdui-chip>
                        </div>
                        <mdui-tooltip content="Vorschlag löschen">
                          <mdui-button-icon
                            icon="delete"
                            style={{ color: "var(--mdui-color-error)", flexShrink: 0 }}
                            onClick={(event: React.MouseEvent) => {
                              event.stopPropagation();
                              deleteProposal(e);
                            }}
                          />
                        </mdui-tooltip>
                      </div>
                    ))}
                </div>
              )}

              {/* Pending proposals: full cards in grid */}
              {proposals.filter(
                (e) =>
                  !options.some((option) => option.id === e.id) &&
                  !options.some((option) => option.title === e.name)
              ).length > 0 && (
                <div className="options-grid">
                  {proposals
                    .sort((a, b) => a.id.localeCompare(b.id))
                    .filter(
                      (e) =>
                        !options.some((option) => option.id === e.id) &&
                        !options.some((option) => option.title === e.name)
                    )
                    .map((e) => (
                      <mdui-card
                        key={e.id}
                        class="option-preview"
                        clickable
                        style={{
                          cursor: "pointer",
                          padding: "20px"
                        }}
                        variant={"outlined"}
                        onClick={() => {
                          setName(e.name);
                          setTeacher(e.teacher);
                          setOptionDescription(e.description);
                          setMax(e.max);
                          setOptionId(e.id);
                          setEditingOptionIndex(null);
                          setOptionDialogOpen(true);
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
                                      e.customFields?.[field.id] && (
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
                              onClick={(event: React.MouseEvent) => {
                                event.stopPropagation();
                                deleteProposal(e);
                              }}
                            />
                          </mdui-tooltip>
                        </div>
                      </mdui-card>
                    ))}
                </div>
              )}
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
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <b>Optionen: {options.length}</b>
            <span style={{ color: "var(--mdui-color-on-surface-variant)" }}>Gesamt max. Plätze: {totalMax}</span>
          </div>
          <mdui-button icon="add" onClick={openNewOptionDialog}>Neue Option hinzufügen</mdui-button>
        </div>

        <div className="options-grid">
          {options.length === 0 && (
            <mdui-card class="option-preview" disabled style={{ padding: "20px" }}>
              <b>Keine Optionen</b>
              <div className="description">
                Fügen Sie eine neue Option hinzu.
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
                  padding: "20px"
                }}
                variant={"outlined"}
                onClick={() => openEditOptionDialog(i)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <b>
                      {e.title} <i>(#{e.id})</i>
                    </b>
                    <div className="teacher">{e.teacher}</div>
                    {e.allowedGrades && e.allowedGrades.length > 0 && (
                      <div className="description" style={{ marginTop: "4px" }}>
                        <strong>Nur für Klassen:</strong> {formatGrades(e.allowedGrades)}
                      </div>
                    )}
                    <div className="description">{e.description}</div>
                    <div className="max">max. {e.max} SchülerInnen</div>
                    {e.leaders && e.leaders.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
                        {e.leaders.map((l: string) => {
                          const [gradeStr, listIndex] = l.split("-");
                          const grade = Number(gradeStr);
                          const cls = classes.find(c => c.grade === grade);
                          const student = cls?.students?.find((s: any) => String(s.listIndex) === listIndex);
                          return (
                            <mdui-chip key={l}>
                              {student ? student.name : l}
                            </mdui-chip>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <mdui-tooltip content="Option löschen">
                    <mdui-button-icon
                      icon="delete"
                      style={{ color: "var(--mdui-color-error)" }}
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteOption(i);
                      }}
                    />
                  </mdui-tooltip>
                </div>
              </mdui-card>
            ))}
        </div>
      </div>
      </mdui-tab-panel>
      </mdui-tabs>

      <mdui-dialog
        class="wide-dialog"
        open={optionDialogOpen}
        onOpenChange={(e: any) => setOptionDialogOpen(e.target.open)}
        headline={editingOptionIndex !== null ? "Option bearbeiten" : "Neue Option"}
        closeOnOverlayClick
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "8px 0" }}>
          <mdui-text-field
            label="Titel"
            placeholder="Programmieren: KI"
            maxlength={25}
            counter
            value={name}
            onInput={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          ></mdui-text-field>
          <mdui-text-field
            label="max. SchülerInnen"
            type="number"
            placeholder="15"
            min={1}
            value={String(max || "")}
            onInput={(e: React.ChangeEvent<HTMLInputElement>) => setMax(Number(e.target.value))}
          ></mdui-text-field>
          <mdui-text-field
            label="Lehrer (optional)"
            placeholder="Hr. Mustermann"
            maxlength={25}
            counter
            value={teacher}
            onInput={(e: React.ChangeEvent<HTMLInputElement>) => setTeacher(e.target.value)}
          ></mdui-text-field>
          <mdui-text-field
            label="Beschreibung (optional)"
            placeholder="Was ist Programmieren? Was ist KI?"
            rows={3}
            maxlength={100}
            counter
            value={optionDescription}
            onInput={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOptionDescription(e.target.value)}
          ></mdui-text-field>

          <mdui-text-field
            label="ID"
            placeholder="Generiert"
            maxlength={20}
            counter
            value={optionId}
            onInput={(e: React.ChangeEvent<HTMLInputElement>) => setOptionId(e.target.value)}
          ></mdui-text-field>

          {/* Allowed Grades Selection */}
          <div style={{ marginTop: "8px", borderTop: "1px solid var(--mdui-color-outline-variant)", paddingTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "16px", fontWeight: "bold" }}>
                Klassenbeschränkung (Option)
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
              <mdui-chip
                selected={optionAllowedGrades.length === 0}
                selectable
                onClick={() => setOptionAllowedGrades([])}
              >
                Alle Klassen
              </mdui-chip>
              {Array.from(new Set(classes.map(c => c.grade)))
                .filter(grade => voteAllowedGrades.length === 0 || voteAllowedGrades.includes(grade))
                .sort((a,b)=>a-b).map((grade) => (
                <mdui-chip
                  key={grade}
                  selected={optionAllowedGrades.includes(grade)}
                  selectable
                  onClick={() => {
                    if (optionAllowedGrades.includes(grade)) {
                      setOptionAllowedGrades(optionAllowedGrades.filter(g => g !== grade));
                    } else {
                      setOptionAllowedGrades([...optionAllowedGrades, grade].sort((a,b)=>a-b));
                    }
                  }}
                >
                  Klasse {grade}
                </mdui-chip>
              ))}
            </div>
          </div>

          {/* Leaders Selection */}
          <div style={{ marginTop: "8px", borderTop: "1px solid var(--mdui-color-outline-variant)", paddingTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "16px", fontWeight: "bold" }}>
                Projektleiter auswählen ({leaders.length} zugewiesen)
              </span>
            </div>

            {leaders.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "12px" }}>
                {leaders.map(l => {
                  const [gradeStr, listIndex] = l.split("-");
                  const grade = Number(gradeStr);
                  const cls = classes.find(c => c.grade === grade);
                  const student = cls?.students?.find((s: any) => String(s.listIndex) === listIndex);
                  return (
                    <mdui-chip key={l} deletable onClick={() => toggleLeader(grade, listIndex)}>
                      {student ? student.name : l} (Klasse {grade})
                    </mdui-chip>
                  );
                })}
              </div>
            )}
            
            <mdui-text-field
              icon="search"
              placeholder="Schüler suchen..."
              value={leaderSearchQuery}
              onInput={(e: any) => setLeaderSearchQuery(e.target.value)}
              clearable
            ></mdui-text-field>

            {leaderSearchQuery && leaderSearchQuery.length > 1 && (
              <div style={{ maxHeight: "200px", overflowY: "auto", marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "8px", alignContent: "flex-start" }}>
                {classes && classes.flatMap(c => 
                  c.students
                    .filter(s => s.name.toLowerCase().includes(leaderSearchQuery.toLowerCase()))
                    .map(s => {
                      const key = `${c.grade}-${s.listIndex}`;
                      const isSelected = leaders.includes(key);
                      if (isSelected) return null;
                      return (
                        <mdui-chip
                          key={key}
                          selectable
                          onClick={() => {
                            toggleLeader(c.grade, s.listIndex);
                            setLeaderSearchQuery("");
                          }}
                        >
                          {s.name} (Kl. {c.grade})
                        </mdui-chip>
                      );
                    })
                )}
                {classes.flatMap(c => c.students.filter(s => s.name.toLowerCase().includes(leaderSearchQuery.toLowerCase()) && !leaders.includes(`${c.grade}-${s.listIndex}`))).length === 0 && (
                  <span style={{ color: "var(--mdui-color-on-surface-variant)", fontSize: "14px", marginTop: "4px" }}>
                    Keine weiteren Schüler gefunden.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <mdui-button slot="action" variant="text" onClick={() => setOptionDialogOpen(false)}>Abbrechen</mdui-button>
        <mdui-button slot="action" variant="tonal" onClick={saveOption} disabled={!name || max === undefined}>Übernehmen</mdui-button>
      </mdui-dialog>
    </div>
  );
}

Edit.loader = async function loader({ params }: LoaderFunctionArgs) {
  try {
    const { id } = params;
    const vote = await getDoc(doc(db, `schools/SCHOOLID/votes/${id}`));

    if (!vote.exists()) {
      throw new Error(`Vote with id ${id} not found`);
    }

    const voteData = { id, ...vote.data() };
    const options = await getDocs(
      collection(db, `schools/SCHOOLID/votes/${id}/options`)
    );
    const optionData = options.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const proposals = await getDocs(
      collection(db, `schools/SCHOOLID/votes/${id}/proposals`)
    );
    const proposalData = proposals.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const classes = await getDocs(collection(db, `schools/SCHOOLID/class`));
    const classData = classes.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      vote: voteData,
      options: optionData,
      proposals: proposalData,
      classes: classData,
    };
  } catch (error) {
    console.error("Failed to load vote:", error);
    throw error;
  }
};

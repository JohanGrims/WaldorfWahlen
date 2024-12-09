import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { snackbar } from "mdui";
import React from "react";
import { useLoaderData } from "react-router-dom";
import { db } from "../../firebase";
import { Choice, Class, Option, Vote } from "../../types";

export default function Add() {
  const { vote, choices, options, classes } = useLoaderData() as {
    vote: Vote;
    choices: Choice[];
    options: Option[];
    classes: Class[];
  };

  const [suggestedStudents, setSuggestedStudents] = React.useState<
    { name: string; grade: number; listIndex: string }[]
  >([]);

  React.useEffect(() => {
    const newSuggestedStudents: {
      name: string;
      grade: number;
      listIndex: string;
    }[] = [];
    for (const c of classes) {
      for (const s of c.students) {
        if (
          choices.find(
            (choice) =>
              choice.listIndex == s.listIndex && choice.grade == c.grade
          ) === undefined
        ) {
          newSuggestedStudents.push({
            name: s.name,
            grade: c.grade,
            listIndex: s.listIndex,
          });
        }
      }
    }

    setSuggestedStudents(newSuggestedStudents);

    // read url params
    const urlParams = new URLSearchParams(window.location.search);
    const name = urlParams.get("name");
    const grade = urlParams.get("grade");
    const listIndex = urlParams.get("listIndex");

    if (name && grade && listIndex) {
      setName(name);
      setGrade(grade);
      setListIndex(Number(listIndex));
    }
  }, []);

  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const [name, setName] = React.useState("");
  const [grade, setGrade] = React.useState("");
  const [listIndex, setListIndex] = React.useState(0);

  const [selected, setSelected] = React.useState(
    Array.from({ length: vote.selectCount }, () => "null")
  );

  const [saving, setSaving] = React.useState(false);

  interface EditStudentParams {
    grade: number;
    listIndex: number;
    name: string;
  }

  function editStudent({ grade, listIndex, name }: EditStudentParams): void {
    setName(name);
    setGrade(grade.toString());
    setListIndex(listIndex);
    setShowSuggestions(false);
  }

  async function saveChoice() {
    setSaving(true);
    addDoc(collection(db, `/votes/${vote.id}/choices`), {
      name,
      grade,
      listIndex,
      selected,
      extraFields: [],
      version: 2,
      timestamp: serverTimestamp(),
    })
      .then((e) => {
        setName("");
        setGrade("");
        setListIndex(0);
        setSelected(Array.from({ length: vote.selectCount }, () => "null"));

        snackbar({
          message: "Wahl hinzugefügt",
        });
        setSaving(false);
      })
      .catch((error) => {
        snackbar({
          message: error.message,
        });
        setSaving(false);
      });
  }

  const submitDisabled =
    name === "" || grade === "" || listIndex === 0 || selected.includes("null");

  return (
    <div className="mdui-prose">
      <h2>Hinzufügen</h2>
      <p />
      {suggestedStudents.length < 1 ? (
        <mdui-card
          variant="filled"
          style={{ width: "100%", padding: "20px" }}
          disabled
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
                <h2>Alle Schüler aus der Datenbank haben gewählt</h2>
                <mdui-icon name="done_all"></mdui-icon>
              </div>
            </div>
          </div>
        </mdui-card>
      ) : (
        <div>
          <mdui-card
            variant="outlined"
            style={{ padding: "20px", width: "100%" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                userSelect: "none",
                cursor: "pointer",
              }}
              onClick={() => setShowSuggestions(!showSuggestions)}
            >
              <h2 style={{ marginBottom: "0px" }}>Vorschläge anzeigen</h2>
              {showSuggestions ? (
                <mdui-button-icon icon="expand_less" />
              ) : (
                <mdui-button-icon icon="expand_more" />
              )}
            </div>

            {showSuggestions && (
              <mdui-tabs
                value={classes.sort((a, b) => a.grade - b.grade)[0].id}
                style={{ width: "100%", overflowX: "auto" }}
              >
                {classes
                  .sort((a, b) => a.grade - b.grade)
                  .map((c) => (
                    <mdui-tab value={c.id}>
                      Klasse {c.grade}
                      <mdui-badge>
                        {
                          suggestedStudents.filter((s) => s.grade == c.grade)
                            .length
                        }
                      </mdui-badge>
                    </mdui-tab>
                  ))}
                <p />
                {classes
                  .sort((a, b) => a.grade - b.grade)
                  .map((c) => (
                    <mdui-tab-panel slot="panel" value={c.id} key={c.id}>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "10px",
                          padding: "10px",
                        }}
                      >
                        {suggestedStudents
                          .filter((s) => s.grade == c.grade)
                          .map((s) => (
                            <mdui-card
                              variant="filled"
                              style={{ padding: "20px", flex: "1 1 200px" }}
                              clickable
                              key={s.listIndex}
                              onClick={() => {
                                editStudent({
                                  grade: s.grade,
                                  listIndex: parseInt(s.listIndex),
                                  name: s.name,
                                });
                              }}
                            >
                              <div
                                className="mdui-prose"
                                style={{ userSelect: "none" }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  {s.name}
                                </div>
                              </div>
                            </mdui-card>
                          ))}
                      </div>
                    </mdui-tab-panel>
                  ))}
              </mdui-tabs>
            )}
          </mdui-card>
        </div>
      )}
      <p />
      <mdui-card variant="outlined" style={{ width: "100%", padding: "10px" }}>
        <div
          style={{
            display: "flex",
            gap: "10px",
          }}
        >
          <mdui-text-field
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            label="Name"
            placeholder="Max M."
            variant="outlined"
          ></mdui-text-field>
          <mdui-text-field
            value={grade}
            onInput={(e) => setGrade((e.target as HTMLInputElement).value)}
            label="Klasse"
            placeholder="10"
            variant="outlined"
          ></mdui-text-field>
          <mdui-text-field
            value={listIndex.toString()}
            onInput={(e) =>
              setListIndex(Number((e.target as HTMLInputElement).value))
            }
            label="Klassenlistennr."
            placeholder="9"
            variant="outlined"
          ></mdui-text-field>
        </div>
        <p />
        <div
          style={{
            display: "flex",
            gap: "10px",
          }}
        >
          {Array.from({ length: vote.selectCount }).map((_, i) => (
            <mdui-select
              value={selected[i]}
              label={`Wahl #${i + 1}`}
              variant="outlined"
            >
              <mdui-menu-item value="null">Keine</mdui-menu-item>
              {options.map((o) => (
                <mdui-menu-item
                  onClick={() => {
                    const newSelected = selected.slice();
                    newSelected[i] = o.id;
                    setSelected(newSelected);
                  }}
                  value={o.id}
                >
                  {o.title}
                </mdui-menu-item>
              ))}
            </mdui-select>
          ))}
        </div>
        <p />
        <mdui-divider />
        <p />
        {saving ? (
          <mdui-button loading icon="save">
            Speichern
          </mdui-button>
        ) : submitDisabled ? (
          <mdui-button disabled icon="save">
            Speichern
          </mdui-button>
        ) : (
          <mdui-button onClick={saveChoice} icon="save">
            Speichern
          </mdui-button>
        )}
      </mdui-card>
    </div>
  );
}

Add.loader = async function loader({ params }) {
  const { id } = params;
  const vote = await getDoc(doc(db, `/votes/${id}`));
  if (!vote.exists()) {
    throw new Response("Vote not found", { status: 404 });
  }
  const voteData = { id: vote.id, ...vote.data() };

  const choices = await getDocs(collection(db, `/votes/${id}/choices`));
  const choiceData = choices.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const options = await getDocs(collection(db, `/votes/${id}/options`));
  const optionData = options.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const results = await getDocs(collection(db, `/votes/${id}/results`));
  const resultData = results.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  // get student database
  const classes = await getDocs(collection(db, `/class`));
  const classesData = classes.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return {
    vote: voteData,
    choices: choiceData,
    options: optionData,
    results: resultData,
    classes: classesData,
  };
};

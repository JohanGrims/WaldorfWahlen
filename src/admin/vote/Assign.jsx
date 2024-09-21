import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore/lite";
import { snackbar } from "mdui";
import React from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";

export default function Assign() {
  const { vote, choices, options } = useLoaderData();

  const [results, setResults] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [mode, setMode] = React.useState("by-option");

  const [rules, setRules] = React.useState([
    {
      apply: "*",
      scores: [1, 2, 4],
    },
  ]);
  const [editRules, setEditRules] = React.useState(false);

  const navigate = useNavigate();

  async function fetchOptimization() {
    setLoading(true);
    try {
      const authToken = await auth.currentUser.getIdToken();

      const projects = {};
      for (const option of options) {
        projects[option.id] = {
          title: option.title,
          max: option.max,
        };
      }

      const preferences = {};
      for (const choice of choices) {
        preferences[choice.id] = {
          name: choice.name,
          selected: choice.selected,
        };
      }
      const requestObject = {
        token: authToken,
        uid: auth.currentUser.uid,
        projects: projects,
        preferences: preferences,
        selectCount: vote.selectCount,
        rules: rules,
      };

      const response = await fetch("https://api.chatwithsteiner.de/assign", {
        method: "POST",
        body: JSON.stringify(requestObject),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      console.log(data);

      setResults(data);
      if (window.location.hostname === "localhost") {
        console.log("Running on localhost");
        setLoading(false);
      }
      setTimeout(() => setLoading(false), 5000);
    } catch (error) {
      console.error("Error fetching optimization:", error);
      snackbar({ message: "Fehler beim Laden der Optimierung." });
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mdui-prose">
        <h2>Automatische Optimierung</h2>
        Die Möglichkeiten werden optimiert. Dies kann einige Sekunden dauern.
        Bitte warten.
        <mdui-linear-progress indeterminate></mdui-linear-progress>
        <p />
        <div
          style={{
            fontStyle: "italic",
            color: "gray",
          }}
        >
          Um alle möglichen Kombinationen zu berechnen, würde es mit 100
          Schülern und 3 Wahlen länger dauern als das Universum alt ist. Es gäbe
          nämlich {Math.pow(3, 100)} mögliche Kombinationen. So lange wollen wir
          nicht warten. Deshalb optimiert ein schlauer Algorithmus für uns. Die
          Berechnungsdauer hängt von der Anzahl der Schüler und der Anzahl der
          Wahlen ab. Bei vielen Schülern und Wahlen kann es einige Sekunden
          dauern. Gleich ist es fertig.
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="mdui-prose">
        <mdui-dialog
          open={editRules}
          onClosed={() => setEditRules(false)}
          headline="Regeln anpassen"
          fullscreen
        >
          {rules.map((rule, i) => (
            <div
              key={i}
              style={{ display: "flex", gap: "10px", marginBottom: "10px" }}
            >
              <mdui-text-field
                label="Anwenden auf"
                placeholder="grade=12"
                value={rule.apply}
                onInput={(e) => {
                  const newRules = [...rules];
                  newRules[i].apply = e.target.value;
                  setRules(newRules);
                }}
              />
              <mdui-text-field
                label="Punkte"
                placeholder="1,2,4"
                value={rule.scores.join(",")}
                onInput={(e) => {
                  const newRules = [...rules];
                  newRules[i].scores = e.target.value.split(",").map(Number);
                  setRules(newRules);
                }}
              />
              <mdui-button-icon
                icon="delete"
                onClick={() => {
                  const newRules = [...rules];
                  newRules.splice(i, 1);
                  setRules(newRules);
                }}
              />
            </div>
          ))}
          <mdui-button
            onClick={() =>
              setRules([...rules, { apply: "", scores: [1, 2, 4] }])
            }
            icon="add"
          >
            Regel hinzufügen
          </mdui-button>
          <mdui-button
            slot="action"
            onClick={() => {
              setEditRules(false);
              snackbar({ message: "Regeln gespeichert." });
            }}
          >
            Speichern
          </mdui-button>
        </mdui-dialog>
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "space-between",
            alignItems: "start",
          }}
        >
          <h2>Zuteilung</h2>
          <mdui-button icon="settings" onClick={() => setEditRules(true)}>
            Regeln anpassen
          </mdui-button>
        </div>
        <p />
        <mdui-card
          variant="filled"
          style={{ width: "100%", padding: "20px" }}
          clickable
          onClick={fetchOptimization}
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
              <h2>Automatische Optimierung</h2>
              <mdui-icon name="auto_awesome"></mdui-icon>
            </div>
            Diese Funktion ordnet die Schüler bestmöglich den Projekten zu. Es
            ist nicht möglich, erzeugte Ergebnisse zu ändern.
          </div>
        </mdui-card>
        <mdui-card
          variant="outlined"
          style={{ width: "100%", padding: "20px" }}
          clickable
          disabled
          onClick={() => navigate("../manually")}
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
                <h2>Manuelle Zuordnung</h2>
                <mdui-icon name="touch_app"></mdui-icon>
              </div>
              <div>Noch nicht verfügbar</div>
            </div>
            Diese Funktion ermöglicht es, die Schüler manuell den Projekten
            zuzuordnen. Dabei wird zunächst von der Erstwahl ausgegangen.
          </div>
        </mdui-card>
      </div>
    );
  }

  const countWahlen = (wahlen) => {
    const counts = {};
    for (let i = 1; i <= wahlen; i++) {
      counts[i] = 0;
    }
    Object.entries(results).forEach(([key, value]) => {
      const wahl =
        choices.find((choice) => choice.id === key).selected.indexOf(value) + 1;
      counts[wahl] = (counts[wahl] || 0) + 1;
    });
    return counts;
  };

  const wahlenCounts = countWahlen(vote.selectCount);

  const sortedResults = Object.entries(results).sort(([keyA], [keyB]) => {
    const nameA = choices
      .find((choice) => choice.id === keyA)
      .name.toLowerCase();
    const nameB = choices
      .find((choice) => choice.id === keyB)
      .name.toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const grades = [...new Set(choices.map((choice) => choice.grade))];

  function saveResults() {
    sortedResults.forEach(([key, value]) => {
      const document = setDoc(doc(db, `/votes/${vote.id}/results/${key}`), {
        result: value,
        comments: [],
      });
    });
    snackbar({ message: "Ergebnisse gespeichert." });
  }

  return (
    <div className="mdui-prose">
      <div
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "space-between",
          alignItems: "start",
        }}
      >
        <h2>Ergebnisse</h2>
        <mdui-button onClick={saveResults}>Ergebnisse speichern</mdui-button>
      </div>
      <p />
      Hier sind die optimierten Zuordnungen der Schüler zu den Projekten.
      <p />
      Insgesamt wurden {Object.keys(results).length} Schüler zugeordnet. Davon
      haben:
      <ul>
        {Object.entries(wahlenCounts).map(([wahl, count]) => (
          <li key={wahl}>
            {count} Schüler die{" "}
            {wahl === "1" ? "Erstwahlen" : `${wahl}. Wahlen`}
          </li>
        ))}
      </ul>
      <mdui-radio-group value={mode}>
        <mdui-radio value="by-option" onClick={() => setMode("by-option")}>
          Nach Projekt
        </mdui-radio>
        <mdui-radio value="by-grade" onClick={() => setMode("by-grade")}>
          Nach Klasse
        </mdui-radio>
        <mdui-radio value="by-name" onClick={() => setMode("by-name")}>
          Nach Name
        </mdui-radio>
      </mdui-radio-group>
      <p />
      {mode === "by-option" && (
        <mdui-tabs
          style={{ width: "100%", overflowX: "auto" }}
          value={options[0].id}
        >
          {options.map((option, i) => (
            <mdui-tab
              style={{ whiteSpace: "nowrap" }}
              key={i}
              value={option.id}
            >
              {option.title} (
              {
                sortedResults.filter(([key, value]) => value === option.id)
                  .length
              }
              /{option.max})
            </mdui-tab>
          ))}
          {options.map((option, i) => (
            <mdui-tab-panel slot="panel" key={i} value={option.id}>
              <p />
              <div style={{ padding: "10px" }}>
                <div className="mdui-table" style={{ width: "100%" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>
                          <b>Name</b>
                        </th>
                        <th>
                          <b>Klasse</b>
                        </th>
                        {Array.from(
                          { length: vote.selectCount },
                          (_, i) => i + 1
                        ).map((i) => (
                          <th key={i}>
                            <b>Wahl {i}</b>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedResults
                        .filter(([key, value]) => value === option.id)
                        .map(([key, value]) => (
                          <tr key={key}>
                            <td>
                              {choices.find((choice) => choice.id === key).name}
                            </td>
                            <td>
                              {
                                choices.find((choice) => choice.id === key)
                                  .grade
                              }
                            </td>
                            {choices
                              .find((choice) => choice.id === key)
                              .selected.map((selected, i) => (
                                <td
                                  key={i}
                                  style={{
                                    cursor: selected !== value && "pointer",
                                    textDecoration:
                                      selected !== value && "underline",
                                    color:
                                      selected !== value && "rgb(27, 68, 133)",
                                  }}
                                  onClick={() => {
                                    if (selected === value) return;
                                    const newResults = { ...results };
                                    newResults[key] = selected;
                                    setResults(newResults);
                                    const previousResults = { ...results };
                                    snackbar({
                                      message: "Änderung rückgängig machen",
                                      action: "Rückgängig",
                                      onActionClick: () =>
                                        setResults(previousResults),
                                    });
                                  }}
                                >
                                  {selected === value
                                    ? "✓"
                                    : `${
                                        options.find(
                                          (option) => option.id === selected
                                        ).title
                                      } (${
                                        sortedResults.filter(
                                          ([key, value]) => value === selected
                                        ).length
                                      }/${
                                        options.find(
                                          (option) => option.id === selected
                                        ).max
                                      })`}
                                </td>
                              ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <h2 style={{ color: "gray" }}>Alle Wähler</h2>
                <div
                  className="mdui-table"
                  style={{ width: "100%", color: "gray" }}
                >
                  <table>
                    <thead>
                      <tr>
                        <th>
                          <b>Name</b>
                        </th>
                        <th>
                          <b>Klasse</b>
                        </th>
                        <th>
                          <b>#</b>
                        </th>
                        {Array.from(
                          { length: vote.selectCount },
                          (_, i) => i + 1
                        ).map((i) => (
                          <th key={i}>
                            <b>Wahl {i}</b>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {choices
                        .filter((choice) => choice.selected.includes(option.id))
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((choice, i) => (
                          <tr key={i}>
                            <td>{choice.name}</td>
                            <td>{choice.grade}</td>
                            <td>{choice.listIndex}</td>
                            {choice.selected.map((selected, i) => (
                              <td
                                key={i}
                                style={{
                                  cursor:
                                    results[choice.id] !== selected &&
                                    "pointer",
                                  textDecoration:
                                    results[choice.id] !== selected &&
                                    "underline",
                                  color:
                                    results[choice.id] !== selected &&
                                    "rgb(27, 68, 133)",
                                }}
                                onClick={() => {
                                  if (results[choice.id] === selected) return;
                                  const newResults = { ...results };
                                  newResults[choice.id] = selected;
                                  setResults(newResults);
                                  const previousResults = { ...results };
                                  snackbar({
                                    message: "Änderung rückgängig machen",
                                    action: "Rückgängig",
                                    onActionClick: () =>
                                      setResults(previousResults),
                                  });
                                }}
                              >
                                {
                                  options.find(
                                    (option) => option.id === selected
                                  ).title
                                }

                                {results[choice.id] === selected &&
                                  ` (${
                                    sortedResults.filter(
                                      ([key, value]) => value === selected
                                    ).length
                                  }/${
                                    options.find(
                                      (option) => option.id === selected
                                    ).max
                                  }) ✓`}
                              </td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </mdui-tab-panel>
          ))}
        </mdui-tabs>
      )}
      {mode === "by-grade" && (
        <mdui-tabs value={grades.sort((a, b) => parseInt(a) - parseInt(b))[0]}>
          {grades
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map((grade, i) => (
              <mdui-tab key={i} value={grade}>
                Klasse {grade}
              </mdui-tab>
            ))}
          {grades.map((grade, i) => (
            <mdui-tab-panel key={i} value={grade} slot="panel">
              <p />
              <div style={{ padding: "10px" }}>
                <div className="mdui-table" style={{ width: "100%" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>
                          <b>Name</b>
                        </th>
                        <th>
                          <b>Klasse</b>
                        </th>
                        <th>
                          <b>#</b>
                        </th>
                        <th>
                          <b>Projekt</b>
                        </th>
                        <th>
                          <b>Wahl</b>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedResults
                        .filter(
                          ([key]) =>
                            choices.find((choice) => choice.id === key)
                              .grade === grade
                        )
                        .sort(([keyA], [keyB]) => {
                          const nameA = choices
                            .find((choice) => choice.id === keyA)
                            .name.toLowerCase();
                          const nameB = choices
                            .find((choice) => choice.id === keyB)
                            .name.toLowerCase();
                          return nameA.localeCompare(nameB);
                        })
                        .map(([key, value], i) => (
                          <tr key={i}>
                            <td>
                              {choices.find((choice) => choice.id === key).name}
                            </td>
                            <td>
                              {
                                choices.find((choice) => choice.id === key)
                                  .grade
                              }
                            </td>
                            <td>
                              {
                                choices.find((choice) => choice.id === key)
                                  .listIndex
                              }
                            </td>
                            <td>
                              {
                                options.find((option) => option.id === value)
                                  .title
                              }
                            </td>
                            <td>
                              {choices
                                .find((choice) => choice.id === key)
                                .selected.indexOf(value) + 1}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </mdui-tab-panel>
          ))}
        </mdui-tabs>
      )}
      {mode === "by-name" && (
        <div>
          <mdui-text-field
            clearable
            label="Suchen"
            onInput={(e) => {
              const query = e.target.value.toLowerCase();
              const elements = document.querySelectorAll("tr");
              elements.forEach((element) => {
                if (element.textContent.toLowerCase().includes(query)) {
                  element.style.display = "";
                } else {
                  element.style.display = "none";
                }
              });
            }}
          ></mdui-text-field>

          <div className="mdui-table">
            <table>
              <thead>
                <tr>
                  <th>
                    <b>Name</b>
                  </th>
                  <th>
                    <b>Klasse</b>
                  </th>
                  <th>
                    <b>#</b>
                  </th>
                  <th>
                    <b>Projekt</b>
                  </th>
                  <th>
                    <b>Wahl</b>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map(([key, value]) => (
                  <tr key={key}>
                    <td>{choices.find((choice) => choice.id === key).name}</td>
                    <td>{choices.find((choice) => choice.id === key).grade}</td>
                    <td>
                      {choices.find((choice) => choice.id === key).listIndex}
                    </td>
                    <td>
                      {options.find((option) => option.id === value).title}
                    </td>
                    <td>
                      {choices
                        .find((choice) => choice.id === key)
                        .selected.indexOf(value) + 1}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export async function loader({ params }) {
  const { id } = params;

  const vote = await getDoc(doc(db, `/votes/${id}`));
  const voteData = { id: vote.id, ...vote.data() };

  const choices = await getDocs(collection(db, `/votes/${id}/choices`));
  const choiceData = choices.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const options = await getDocs(collection(db, `/votes/${id}/options`));
  const optionData = options.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return {
    vote: voteData,
    choices: choiceData,
    options: optionData,
  };
}

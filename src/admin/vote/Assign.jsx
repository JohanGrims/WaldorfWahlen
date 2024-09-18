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
          Um alle möglichen Kombinationen zu berechnen, würde es mit{" "}
          {choices.length} Schülern und {vote.selectCount} Wahlen länger dauern
          als das Universum alt ist. Es gäbe nämlich{" "}
          {Math.pow(vote.selectCount, choices.length)} mögliche Kombinationen.
          So lange wollen wir nicht warten. Deshalb optimiert ein schlauer
          Algorithmus für uns. Die Berechnungsdauer hängt von der Anzahl der
          Schüler und der Anzahl der Wahlen ab. Bei vielen Schülern und Wahlen
          kann es einige Sekunden dauern. Gleich ist es fertig.
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div>
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
      <h2>Ergebnisse</h2>
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
          Nach Erstwahl
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
              {option.title}
              <mdui-badge>
                {
                  Object.values(results).filter(
                    (result) => result === option.id
                  ).length
                }
              </mdui-badge>
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
      <p />
      <mdui-button onClick={saveResults}>Ergebnisse speichern</mdui-button>
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

import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { confirm, snackbar } from "mdui";
import React from "react";
import { useLoaderData } from "react-router-dom";
import { auth, db } from "../../firebase";

export default function Assign() {
  const { vote, choices, options, results: cloudResults } = useLoaderData();

  const [results, setResults] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [mode, setMode] = React.useState("by-option");

  const [search, setSearch] = React.useState("");

  const [rules, setRules] = React.useState([
    {
      apply: "*",
      scores: [1, 2, 4],
    },
  ]);
  const [editRules, setEditRules] = React.useState(false);

  function setCloudResults() {
    let newResults = {};

    cloudResults.forEach((result) => {
      newResults[result.id] = result.result;
    });

    // assign other results to first choice
    choices.forEach((choice) => {
      if (!newResults[choice.id]) {
        newResults[choice.id] = choice.selected[0];
      }
    });
    setResults(newResults);
  }

  function assignToFirstChoice() {
    const results = {};
    choices.forEach((choice) => {
      results[choice.id] = choice.selected[0];
    });
    setResults(results);
  }

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
        let points = [1, 2, 4];
        for (const rule of rules) {
          if (rule.apply === "*") {
            points = rule.scores;
          }
          const conditions = rule.apply.split(",");
          let matches = true;
          for (const condition of conditions) {
            const [key, value] = condition.split("=");
            if (key === "grade" && parseInt(choice.grade) !== parseInt(value)) {
              matches = false;
              break;
            }
            if (key === "listIndex" && choice.listIndex !== parseInt(value)) {
              matches = false;
              break;
            }
            if (key === "selected") {
              const selected = value.split(",");
              if (!selected.every((id) => choice.selected.includes(id))) {
                matches = false;
                break;
              }
            }
          }
          if (matches) {
            points = rule.scores;
          }
        }

        preferences[choice.id] = {
          selected: choice.selected,
          points: points,
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

      setResults(data);
      if (window.location.hostname === "localhost") {
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
              {rule.apply === "*" ? (
                <mdui-text-field
                  label="Bedingung"
                  placeholder="grade=12"
                  value={rule.apply}
                  onInput={(e) => {
                    const newRules = [...rules];
                    newRules[i].apply = e.target.value;
                    setRules(newRules);
                  }}
                  disabled
                />
              ) : (
                <mdui-text-field
                  label="Bedingung"
                  placeholder="grade=12"
                  value={rule.apply}
                  onInput={(e) => {
                    const newRules = [...rules];
                    newRules[i].apply = e.target.value;
                    setRules(newRules);
                  }}
                />
              )}
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
              {rule.apply === "*" ? (
                <mdui-button-icon icon="lock" disabled />
              ) : (
                <mdui-button-icon
                  icon="delete"
                  onClick={() => {
                    const newRules = [...rules];
                    newRules.splice(i, 1);
                    setRules(newRules);
                  }}
                />
              )}
              {i === 0 ? (
                <mdui-button-icon icon="arrow_upward" disabled />
              ) : (
                <mdui-button-icon
                  icon="arrow_upward"
                  onClick={() => {
                    const newRules = [...rules];
                    const temp = newRules[i - 1];
                    newRules[i - 1] = newRules[i];
                    newRules[i] = temp;
                    setRules(newRules);
                  }}
                />
              )}
              {i === rules.length - 1 ? (
                <mdui-button-icon icon="arrow_downward" disabled />
              ) : (
                <mdui-button-icon
                  icon="arrow_downward"
                  onClick={() => {
                    const newRules = [...rules];
                    const temp = newRules[i + 1];
                    newRules[i + 1] = newRules[i];
                    newRules[i] = temp;
                    setRules(newRules);
                  }}
                />
              )}
            </div>
          ))}
          <mdui-button
            onClick={() => setRules([...rules, { apply: "", scores: [] }])}
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
          <p />
          <div style={{ color: "gray" }}>
            <b>Regeln</b> sind Bedingungen, die festlegen, wie die Schüler den
            Projekten zugeordnet werden. Die Regeln werden in der Reihenfolge
            angewendet, in der sie hier aufgelistet sind. Die Regeln werden auf
            die Schüler angewendet, die die Bedingungen erfüllen. Die Punkte
            geben an, wie viele Punkte die Schüler für die jeweilige Wahl
            erhalten. Die Regeln können auf verschiedene Kriterien angewendet
            werden. Die Kriterien sind in der Form <code>key=value</code>{" "}
            angegeben. Mehrere Kriterien können durch Kommas getrennt werden.
            Die Kriterien sind:
            <ul>
              <li>
                <code>grade</code>: Klasse
              </li>
              <li>
                <code>listIndex</code>: Nummer auf der Liste
              </li>
              <li>
                <code>selected</code>: IDs der Projekte, die gewählt wurden
              </li>
            </ul>
            <p />
            <b>Beispiel:</b> Die Regel <code>grade=12</code> wird nur auf die
            Schüler der 12. Klasse angewendet. Die Regel{" "}
            <code>grade=12,listIndex=1</code> wird nur auf den Schüler
            angewendet, der an erster Stelle steht.
            <p />
            Das Sternchen <code>*</code> steht für alle Schüler. Die Regel{" "}
            <code>*</code> wird auf alle Schüler angewendet.
          </div>
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
        {cloudResults.length > 0 && (
          <mdui-card
            variant="outlined"
            style={{ width: "100%", padding: "20px" }}
            clickable
            onClick={setCloudResults}
          >
            <div className="mdui-prose" style={{ width: "100%" }}>
              <div
                style={{
                  display: "flex",
                  textWrap: "nowrap",
                  gap: "10px",
                }}
              >
                <h2 style={{ marginBottom: "0px" }}>Letzte Ergebnisse laden</h2>
                <mdui-icon name="cloud"></mdui-icon>
              </div>
            </div>
          </mdui-card>
        )}
        <mdui-card
          variant="filled"
          style={{ width: "100%", padding: "20px" }}
          clickable
          disabled={Number(vote.selectCount) !== 3}
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
            {Number(vote.selectCount) !== 3 && (
              <b>Nur bei 3 Wahlen verfügbar — </b>
            )}
            Diese Funktion ordnet die Schüler bestmöglich den Projekten zu. Es
            ist möglich, erzeugte Ergebnisse zu ändern.
          </div>
        </mdui-card>
        <mdui-card
          variant="outlined"
          style={{ width: "100%", padding: "20px" }}
          clickable
          onClick={assignToFirstChoice}
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
              <div>Beta</div>
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
      setDoc(doc(db, `/votes/${vote.id}/results/${key}`), {
        result: value,
        comments: [],
      });
    });
    snackbar({ message: "Ergebnisse gespeichert." });
  }

  const filteredResults = () => {
    if (mode === "power-search") {
      return sortedResults.filter(([key]) => {
        const choice = choices.find((choice) => choice.id === key);
        const searchTerms = search.split(",");
        return searchTerms.every((term) => {
          const orTerms = term.split("|");
          return orTerms.some((orTerm) => {
            const isNegative = orTerm.startsWith("!");
            const [key, value] = isNegative
              ? orTerm.slice(1).split("=")
              : orTerm.split("=");
            if (value) {
              if (key === "name") {
                return isNegative
                  ? !choice.name.toLowerCase().includes(value.toLowerCase())
                  : choice.name.toLowerCase().includes(value.toLowerCase());
              }
              if (key === "grade") {
                return isNegative
                  ? choice.grade !== value
                  : choice.grade === value;
              }
              if (key === "assignedTo") {
                return isNegative
                  ? results[choice.id] !== value
                  : results[choice.id] === value;
              }
              if (key === "choice") {
                return isNegative
                  ? results[choice.id] !== choice.selected[parseInt(value) - 1]
                  : results[choice.id] === choice.selected[parseInt(value) - 1];
              }
              if (key === "selected") {
                return isNegative
                  ? !choice.selected.includes(value)
                  : choice.selected.includes(value);
              }
              if (key.startsWith("selected[")) {
                const index = parseInt(key.match(/\d+/)?.[0]) - 1;
                if (isNaN(index)) return false;
                if (!choice.selected[index]) return false;
                return isNegative
                  ? choice.selected[index] !== value
                  : choice.selected[index] === value;
              }
            }
            return false;
          });
        });
      });
    }
    return sortedResults;
  };

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
        <div>
          <mdui-tooltip content="Regeln anpassen" variant="rich">
            <mdui-button-icon
              icon="history"
              onClick={() => {
                confirm({
                  headline: "Zurücksetzen?",
                  description:
                    "Dadurch werden die Ergebnisse zurückgesetzt und müssen erneut berechnet werden.",
                  confirmText: "Zurücksetzen",
                  cancelText: "Abbrechen",
                  onConfirm: () => {
                    setResults(null);
                    setEditRules(true);
                  },
                });
              }}
            ></mdui-button-icon>
          </mdui-tooltip>
          <mdui-button onClick={saveResults}>Ergebnisse speichern</mdui-button>
        </div>
      </div>
      <p />
      {mode !== "power-search" && (
        <>
          Insgesamt wurden {Object.keys(results).length} Schüler zugeordnet.
          Davon haben:{" "}
          {Object.entries(wahlenCounts).map(([wahl, count]) => (
            <>
              <i>{count}</i> Schüler die{" "}
              {wahl === "1"
                ? "Erstwahlen, "
                : `${wahl}. Wahlen${
                    wahl === vote.selectCount.toString() ? "." : ","
                  } `}
            </>
          ))}
        </>
      )}
      <p />
      <mdui-radio-group value={mode}>
        <mdui-radio
          value="power-search"
          onClick={() => setMode("power-search")}
          unchecked-icon="query_stats"
        >
          Power-Search <mdui-icon name="beta"></mdui-icon>
        </mdui-radio>
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
      {mode === "power-search" && (
        <div>
          <mdui-collapse>
            <mdui-collapse-item value="info">
              <mdui-list-item rounded slot="header" icon="info">
                Informationen
                <mdui-icon
                  slot="end-icon"
                  name="keyboard_arrow_down"
                ></mdui-icon>
              </mdui-list-item>
              <div className="mdui-prose">
                Durchsuchen Sie die Ergebnisse mit folgenden Operatoren:
                <ul>
                  <li>
                    <code>name=Johan</code>: Schüler deren Name Johan enthält
                  </li>
                  <li>
                    <code>grade=12</code>: Schüler der 12. Klasse
                  </li>
                  <li>
                    <code>assignedTo=abc</code>: Schüler die zu dem Projekt mit
                    der ID abc zugewiesen sind
                  </li>
                  <li>
                    <code>choice=2</code>: Schüler die zu ihrer Zweitwahl
                    zugewiesen sind
                  </li>
                  <li>
                    <code>selected=abc</code>: Schüler die das Projekt mit der
                    ID abc gewählt haben
                  </li>
                  <li>
                    <code>selected[1]=abc</code>: Schüler die das Projekt mit
                    der ID abc als Erstwahl gewählt haben
                  </li>
                </ul>
                <p />
                Kombinieren Sie beliegbig viele Operatoren mit einem Komma:{" "}
                <code>
                  name=Johan,grade=12,assignedTo=xyz,choice=2,selected=abc
                </code>
                <br />
                Schreiben Sie ein logisches Oder mit einem Pipe:{" "}
                <code>name=Johan|name=Max,grade=12</code>
                <br />
                Nutzen Sie ein ! um die Bedingung zu negieren:{" "}
                <code>!grade=12</code>
              </div>
            </mdui-collapse-item>
            <mdui-collapse-item value="results">
              <mdui-list-item rounded slot="header" icon="preview">
                Projekte anzeigen
                <mdui-icon
                  slot="end-icon"
                  name="keyboard_arrow_down"
                ></mdui-icon>
              </mdui-list-item>
              <div className="mdui-table">
                <table>
                  <thead>
                    <tr>
                      <th>
                        <b>Projekt</b>
                      </th>
                      <th>
                        <b>Maximalanzahl</b>
                      </th>
                      <th>
                        <b>Belegte Plätze</b>
                      </th>
                      <th>
                        <b>ID</b>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {options.map((option, i) => (
                      <tr key={i}>
                        <td>{option.title}</td>
                        <td>{option.max}</td>
                        <td>
                          {
                            sortedResults.filter(
                              ([, value]) => value === option.id
                            ).length
                          }
                        </td>
                        <td>{option.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </mdui-collapse-item>
          </mdui-collapse>
          <p />
          <div
            className="flex-row"
            style={{ gap: "10px", alignItems: "center" }}
          >
            <mdui-text-field
              label="Power-Search"
              clearable
              placeholder="name=Johan,grade=12"
              onInput={(e) => {
                setSearch(e.target.value);
              }}
              value={search}
            ></mdui-text-field>
            <mdui-tooltip
              variant="rich"
              headline="Zufallswahl"
              content="Es wird ein zufälliger Schüler nach den Bedingungen ausgewählt."
            >
              <mdui-button-icon
                onClick={() => {
                  const filtered = filteredResults();
                  const randomIndex = Math.floor(
                    Math.random() * filtered.length
                  );

                  const element = document.querySelector(
                    `#power-search tr:nth-child(${randomIndex + 1})`
                  );

                  console.log(element);
                  element.scrollIntoView({
                    behavior: "smooth",
                  });
                  element.style.backgroundColor =
                    "rgb(var(--mdui-color-tertiary-container-dark))";
                  setTimeout(() => {
                    element.style.backgroundColor = "";
                  }, 5000);
                }}
                icon="casino--outlined"
              ></mdui-button-icon>
            </mdui-tooltip>
          </div>
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
              <tbody id="power-search">
                {filteredResults().map(([key, value]) => (
                  <tr key={key}>
                    <td>{choices.find((choice) => choice.id === key).name}</td>
                    <td>{choices.find((choice) => choice.id === key).grade}</td>
                    <td>
                      {choices.find((choice) => choice.id === key).listIndex}
                    </td>
                    {choices
                      .find((choice) => choice.id === key)
                      .selected.map((selected, i) => (
                        <td
                          key={i}
                          style={{
                            cursor: selected !== value && "pointer",
                            textDecoration: selected !== value && "underline",
                            color: selected !== value && "rgb(27, 68, 133)",
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
                              onActionClick: () => setResults(previousResults),
                            });
                          }}
                        >
                          {selected === value && `✓ `}
                          {`${
                            options.find((option) => option.id === selected)
                              .title
                          } (${
                            sortedResults.filter(
                              ([, value]) => value === selected
                            ).length
                          }/${
                            options.find((option) => option.id === selected).max
                          })`}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
              {option.max <
                sortedResults.filter(([, value]) => value === option.id)
                  .length && "! "}
              {option.title} (
              {sortedResults.filter(([, value]) => value === option.id).length}/
              {option.max})
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
                        .filter(([, value]) => value === option.id)
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
                                          ([, value]) => value === selected
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
                                      ([, value]) => value === selected
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

Assign.loader = async function loader({ params }) {
  const { id } = params;

  const vote = await getDoc(doc(db, `/votes/${id}`));
  const voteData = { id: vote.id, ...vote.data() };

  const choices = await getDocs(collection(db, `/votes/${id}/choices`));
  const choiceData = choices.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const options = await getDocs(collection(db, `/votes/${id}/options`));
  const optionData = options.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const results = await getDocs(collection(db, `/votes/${id}/results`));
  const resultsData = results.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return {
    vote: voteData,
    choices: choiceData,
    options: optionData,
    results: resultsData,
  };
};

import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { useLoaderData } from "react-router-dom";
import { auth, db } from "../../firebase";

import { confirm, snackbar } from "mdui";
import React from "react";

export default function Results() {
  const { vote, options, results, choices } = useLoaderData();

  const [mode, setMode] = React.useState("all");

  const grades = [...new Set(choices.map((choice) => choice.grade))];

  function printResults() {
    const printContents = document.querySelector(".print-table").outerHTML;

    // Neues iframe erstellen
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "absolute";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "none";
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow || printFrame.contentDocument;
    frameDoc.document.open();
    frameDoc.document.write(`
      <html>
        <head>
          <title>Drucken</title>
          <style>
            /* Optional: Stil-Definitionen für den Druck */
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);
    frameDoc.document.close();

    // print()-Funktion des iframe verwenden
    frameDoc.focus();
    frameDoc.print();

    // iframe nach dem Drucken entfernen
    setTimeout(() => {
      document.body.removeChild(printFrame);
    }, 1000);
  }

  function publishResults() {
    confirm({
      headline: "Ergebnisse veröffentlichen",
      description:
        "Sind Sie sicher, dass Sie die Ergebnisse veröffentlichen möchten? Dies kann nicht rückgängig gemacht werden.",
      confirmText: "Ja, veröffentlichen",
      cancelText: "Abbrechen",
      onConfirm: () => {
        setDoc(
          doc(db, `votes/${vote.id}`),
          {
            result: true,
          },
          { merge: true }
        ).then(() => {
          snackbar({
            message: "Ergebnisse veröffentlicht.",
            action: "Seite neuladen",
            onActionClick: () => window.location.reload(),
          });
        });
      },
    });
  }

  const filteredResults = () => {
    // sort by grade
    let resultsByGrade = {};
    choices.forEach((choice) => {
      if (!results.find((result) => result.id === choice.id)) {
        return;
      }
      if (!resultsByGrade[choice.grade]) {
        resultsByGrade[choice.grade] = [];
      }
      resultsByGrade[choice.grade].push({
        ...results.find((result) => result.id === choice.id),
        name: choice.name,
      });
    });

    //  then sort by listIndex
    Object.keys(resultsByGrade).forEach((grade) => {
      resultsByGrade[grade].sort((a, b) => {
        return (
          choices.find((choice) => choice.id === a.id).listIndex -
          choices.find((choice) => choice.id === b.id).listIndex
        );
      });
    });

    // Convert resultsByGrade object to a list
    let resultsList = [];
    Object.keys(resultsByGrade).forEach((grade) => {
      resultsByGrade[grade].forEach((result) => {
        resultsList.push({
          ...result,
          grade: grade,
        });
      });
    });

    return resultsList;
  };
  return (
    <div className="mdui-prose">
      <h2>Ergebnisse</h2>
      <mdui-card
        variant="outlined"
        style={{ width: "100%", padding: "20px" }}
        clickable
        disabled={vote.result || !results.length}
        onClick={publishResults}
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
              <h2>Ergebnisse veröffentlichen</h2>
              <mdui-icon name="upload"></mdui-icon>
            </div>
            {vote.result && <div>Bereits veröffentlicht</div>}
          </div>
          Bei der Veröffentlichung werden keine persönlichen Daten
          veröffentlicht. Deshalb ist das Ansehen nur auf dem selben Gerät
          möglich, auf dem die Antwort abgegeben wurde.
        </div>
      </mdui-card>
      <mdui-card
        variant="outlined"
        clickable
        onClick={printResults}
        style={{ width: "100%", padding: "20px" }}
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
              <h2 style={{ marginBottom: 0 }}>
                {mode === "all"
                  ? "Alle Ergebnisse"
                  : mode === "project"
                  ? "Nach Projekt"
                  : "Nach Klasse"}{" "}
                drucken
              </h2>
              <mdui-icon name="print"></mdui-icon>
            </div>
          </div>
        </div>
      </mdui-card>
      <br />
      <p />
      <mdui-divider />
      <p />
      <mdui-radio-group value={mode}>
        <mdui-radio value="all" onClick={() => setMode("all")}>
          Alle
        </mdui-radio>
        <mdui-radio value="project" onClick={() => setMode("project")}>
          Nach Projekt
        </mdui-radio>
        <mdui-radio value="class" onClick={() => setMode("class")}>
          Nach Klasse
        </mdui-radio>
      </mdui-radio-group>

      {mode === "all" && (
        <>
          <div className="mdui-table" style={{ width: "100%" }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Klasse</th>
                  <th>#</th>
                  <th>Projekt</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults().map((result) => (
                  <tr key={result.id}>
                    <td>
                      {choices.find((choice) => choice.id === result.id).name}
                    </td>
                    <td>
                      {choices.find((choice) => choice.id === result.id).grade}
                    </td>
                    <td>
                      {
                        choices.find((choice) => choice.id === result.id)
                          .listIndex
                      }
                    </td>
                    <td>
                      {
                        options.find((option) => option.id === result.result)
                          .title
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="print-table">
            <h2>{vote.title}</h2>
            <table>
              <>
                <tr>
                  <th>Klasse</th>
                  <th>Name</th>
                  <th>Projekt</th>
                </tr>
              </>
              <tbody>
                {filteredResults().map((result) => (
                  <tr key={result.id}>
                    <td>
                      {choices.find((choice) => choice.id === result.id).name}
                    </td>
                    <td>
                      {choices.find((choice) => choice.id === result.id).grade}
                    </td>
                    <td>
                      {
                        options.find((option) => option.id === result.result)
                          .title
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
              <>
                <tr>
                  <td colSpan="3">
                    <i>
                      Generiert am {new Date().toLocaleDateString()} von{" "}
                      {auth.currentUser.email} mit WaldorfWahlen
                    </i>
                  </td>
                </tr>
              </>
            </table>
          </div>
        </>
      )}

      {mode === "project" && (
        <>
          <mdui-tabs
            style={{ width: "100%", overflowX: "auto" }}
            value={options[0].id}
          >
            {options.map((option) => (
              <mdui-tab
                style={{ whiteSpace: "nowrap" }}
                key={option.id}
                value={option.id}
              >
                {option.title}
              </mdui-tab>
            ))}
            {options.map((option) => (
              <mdui-tab-panel
                key={option.id}
                id={option.id}
                slot="panel"
                value={option.id}
              >
                <>
                  <p />
                  <div style={{ padding: "10px" }}>
                    <div className="mdui-table" style={{ width: "100%" }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Klasse</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredResults()
                            .filter((result) => result.result === option.id)
                            .map((result) => (
                              <tr key={result.id}>
                                <td>
                                  {
                                    choices.find(
                                      (choice) => choice.id === result.id
                                    ).name
                                  }
                                </td>
                                <td>
                                  {
                                    choices.find(
                                      (choice) => choice.id === result.id
                                    ).grade
                                  }
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              </mdui-tab-panel>
            ))}
          </mdui-tabs>
          <div className="print-table">
            <h2>{vote.title}</h2>
            {options.map((option) => (
              <div key={option.id}>
                <h3>{option.title}</h3>
                <table>
                  <>
                    <tr>
                      <th>Name</th>
                      <th>Klasse</th>
                    </tr>
                  </>
                  <tbody>
                    {filteredResults()
                      .filter((result) => result.result === option.id)
                      .map((result) => (
                        <tr key={result.id}>
                          <td>
                            {
                              choices.find((choice) => choice.id === result.id)
                                .name
                            }
                          </td>
                          <td
                            style={{
                              width: "50px",
                            }}
                          >
                            {
                              choices.find((choice) => choice.id === result.id)
                                .grade
                            }
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ))}
            <>
              <p>
                Generiert am {new Date().toLocaleDateString()} von{" "}
                {auth.currentUser.email} mit WaldorfWahlen
              </p>
            </>
          </div>
        </>
      )}

      {mode === "class" && (
        <>
          <mdui-tabs
            style={{ width: "100%", overflowX: "auto" }}
            value={grades.sort((a, b) => parseInt(a) - parseInt(b))[0]}
          >
            {grades
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map((grade) => (
                <mdui-tab
                  style={{ whiteSpace: "nowrap" }}
                  key={grade}
                  value={grade}
                >
                  Klasse {grade}
                </mdui-tab>
              ))}
            {grades
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map((grade) => (
                <mdui-tab-panel
                  key={grade}
                  id={grade}
                  slot="panel"
                  value={grade}
                >
                  <>
                    <p />
                    <div style={{ padding: "10px" }}>
                      <div className="mdui-table" style={{ width: "100%" }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Projekt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredResults()
                              .filter((result) => result.grade === grade)
                              .map((result) => (
                                <tr key={result.id}>
                                  <td>
                                    {
                                      choices.find(
                                        (choice) => choice.id === result.id
                                      ).name
                                    }
                                  </td>
                                  <td>
                                    {
                                      options.find(
                                        (option) => option.id === result.result
                                      ).title
                                    }
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                </mdui-tab-panel>
              ))}
          </mdui-tabs>

          <div className="print-table">
            <h2>{vote.title}</h2>
            {grades.map((grade) => (
              <div key={grade}>
                <h3>Klasse {grade}</h3>
                <table>
                  <>
                    <tr>
                      <th>Name</th>
                      <th>Projekt</th>
                    </tr>
                  </>
                  <tbody>
                    {filteredResults()
                      .filter((result) => result.grade === grade)
                      .map((result) => (
                        <tr key={result.id}>
                          <td style={{ width: "50%" }}>
                            {
                              choices.find((choice) => choice.id === result.id)
                                .name
                            }
                          </td>
                          <td>
                            {
                              options.find(
                                (option) => option.id === result.result
                              ).title
                            }
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <br />
              </div>
            ))}
            <>
              <p>
                Generiert am {new Date().toLocaleDateString()} von{" "}
                {auth.currentUser.email} mit WaldorfWahlen
              </p>
            </>
          </div>
        </>
      )}
    </div>
  );
}

Results.loader =  async function loader({ params }) {
  const { id } = params;
  const vote = await getDoc(doc(db, `/votes/${id}`));
  const voteData = { id: vote.id, ...vote.data() };
  const options = (
    await getDocs(collection(db, `/votes/${id}/options`))
  ).docs.map((doc) => {
    return { id, ...doc.data() };
  });

  const results = (
    await getDocs(collection(db, `/votes/${id}/results`))
  ).docs.map((doc) => {
    return { id: doc.id, ...doc.data() };
  });

  const choices = (
    await getDocs(collection(db, `/votes/${id}/choices`))
  ).docs.map((doc) => {
    return { id: doc.id, ...doc.data() };
  });

  return {
    vote: voteData,
    options,
    results,
    choices,
  };
}

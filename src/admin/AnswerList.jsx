import { AES, enc } from "crypto-js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore/lite";
import React, { useEffect, useState } from "react";
import AceEditor from "react-ace";

import { useNavigate, useParams } from "react-router-dom";
import { db } from "../firebase";

import "ace-builds/src-noconflict/ext-language_tools";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-tomorrow";
import { CSVLink } from "react-csv";
import CSVFileUpload from "./FileUpload";

export default function AnswerList() {
  const navigate = useNavigate();

  const { id } = useParams();
  const [choices, setChoices] = useState({});
  const [options, setOptions] = useState({});
  const [selectCount, setSelectCount] = useState();
  const [title, setTitle] = useState();
  const [code, setCode] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(true);
  const [active, setActive] = React.useState();
  const [results, setResults] = React.useState();
  const [notAssigned, setNotAssigned] = React.useState([]);
  const [extraFields, setExtraFields] = React.useState([]);

  useEffect(() => {
    try {
      getDoc(doc(db, `/votes/${id}`)).then((e) => {
        let data = e.data();
        console.log(data);
        if (data === undefined) {
          alert("Document not found");
          navigate("/admin");
          return;
        }
        setSelectCount(data.selectCount);
        setTitle(data.title);
        setActive(data.active);
        setResults(data.results);
        setExtraFields(data.extraFields);
      });

      getDocs(collection(db, `/votes/${id}/choices`)).then((data) => {
        let optionsLet;
        let choicesLet;

        data.docs.forEach((e) => {
          let data = e.data();
          choicesLet = { ...choicesLet, [e.id]: data };
          setChoices((prevChoices) => {
            return { ...prevChoices, [e.id]: data };
          });
        });

        getDocs(collection(db, `/votes/${id}/options`)).then((data) => {
          data.docs.forEach((e) => {
            let data = e.data();
            optionsLet = { ...optionsLet, [e.id]: data };
            setOptions((prevOptions) => {
              return { ...prevOptions, [e.id]: data };
            });
          });

          setCode(`setNotAssigned([])
const choices = ${JSON.stringify(choicesLet)};
const options = ${JSON.stringify(optionsLet)};


function findMemberId(ids, choice) {
  const sortedIds = ids.sort((a, b) => {
  if (choices[a].selected.indexOf(choice) < choices[b].selected.indexOf(choice)) {
    return 1;
  }
  if (choices[a].selected.indexOf(choice) > choices[b].selected.indexOf(choice)) {
    return -1;
  }
  return b.localeCompare(a);
  });
  const lastId = sortedIds[0];
  return lastId;
}

function assignChoice(choiceID, attempt = 0){
  let choice = choices[choiceID]["selected"][attempt]
  let members = options[choice]["members"] ? [...options[choice]["members"], choiceID]:[choiceID]
  if(members.length > options[choice]["max"]){
    let lastId = findMemberId(members, choice);
    members = members.filter(item => item !== lastId);
    options[choice]["members"] = members
    attempt = choices[lastId]["selected"].indexOf(choice) + 1
    if(attempt === choices[lastId]["selected"].length){
      console.error(lastId+ "konnte nicht zugeordnet werden.")
      setNotAssigned(notAssigned =>[...notAssigned, lastId])
    }
    else{
      assignChoice(lastId, attempt)}
  }
  else{
    options[choice]["members"] = members
  }
}


const sortedStudentIds = Object.keys(choices).sort((a, b) => a - b);

for (const student of sortedStudentIds) {
  assignChoice(student);
}

setResult(options)
console.log(options)
    `);
          console.log(optionsLet);
          console.log(choicesLet);
          setLoading(false);
        });
      });
    } catch (error) {
      alert(error);
      AES("");
      console.log(enc);
    }
  }, [id]);

  const downloadResults = () => {
    // Transform result and choices into CSV format
    const csvData = [];

    Object.keys(result).forEach((e) => {
      csvData.push([result[e]["title"]]); // Push title as a separate row
      result[e].members?.forEach((member) => {
        csvData.push([
          choices[member]["name"],
          choices[member]["grade"],
          choices[member].selected.indexOf(e) + 1,
          ...choices[member].extraFields,
        ]); // Push member data as a separate row
      });
      csvData.push(["", ""]); // Add an empty row between different titles
    });
    notAssigned.map((e) => {
      csvData.push([
        "Konnte nicht zugeordnet werden:",
        choices[e].name,
        choices[e].grade,
        ...choices[e].extraFields,
      ]);
    });

    return csvData;
  };

  const downloadVotes = () => {
    const csvData = [];

    // Header hinzufügen
    const header = ["Klasse", "Name"];
    for (let i = 1; i <= selectCount; i++) {
      header.push(`${i}. Wahl`);
    }
    for (let i = 0; i < extraFields?.length; i++) {
      header.push(extraFields[i]);
    }

    csvData.push(header);

    // Datenzeilen hinzufügen
    Object.keys(choices).forEach((key) => {
      const row = [
        choices[key].grade,
        choices[key].name,
        ...choices[key].selected.map((e) => options[e].title),
        ...choices[key]?.extraFields,
      ];
      csvData.push(row);
    });

    return csvData;
  };

  const downloadProjects = () => {
    const csvData = [];

    // Header hinzufügen
    const header = ["Name", "Lehrer", "Max"];
    csvData.push(header);

    // Datenzeilen hinzufügen
    Object.keys(options).forEach((key) => {
      const row = [options[key].title, options[key].teacher, options[key].max];
      csvData.push(row);
    });

    return csvData;
  };

  function deactivate() {
    updateDoc(doc(db, `/votes/${id}`), {
      active: false,
      // Object.keys(result).map((e) => {
      //     return {
      //       title: result[e].title,
      //       members: result[e].members
      //         ? [
      //             ...result[e].members.map(
      //               (e) => `${choices[e]["name"]}, ${choices[e]["grade"]}. Kl.`
      //             ),
      //           ]
      //         : [],
      //     };
      //   }),
    }).then(() => {
      setActive(false);
    });
  }

  function activate() {
    updateDoc(doc(db, `/votes/${id}`), {
      active: true,
      // Object.keys(result).map((e) => {
      //     return {
      //       title: result[e].title,
      //       members: result[e].members
      //         ? [
      //             ...result[e].members.map(
      //               (e) => `${choices[e]["name"]}, ${choices[e]["grade"]}. Kl.`
      //             ),
      //           ]
      //         : [],
      //     };
      //   }),
    }).then(() => {
      setActive(true);
    });
  }

  function upload(data) {
    updateDoc(doc(db, `/votes/${id}`), {
      active: false,
      results: JSON.stringify(data),
    }).then(() => {
      setResults(data);
    });
  }

  if (loading) {
    return <div />;
  }

  return (
    <div className="admin">
      <div style={{ width: "60%" }}>
        <h2>{title}</h2>
        {}
        <button
          disabled={!active}
          className={`button ${!active && "disabled"}`}
          onClick={deactivate}
        >
          {active ? "Umfrage beenden" : "Umfrage beendet"}
        </button>{" "}
        {!active && (
          <>
            <a
              className="secondary"
              style={{ cursor: "pointer" }}
              onClick={activate}
            >
              {"Umfrage erneut aktivieren"}
            </a>
            <p />
            {!results ? (
              <div className="button disabled">
                <i>
                  Sie können hier eine .CSV Datei mit der endgültigen Verteilung
                  hochladen, die anschließend von Besuchern der Website
                  abgerufen werden kann. (Achtung: Dies muss
                  datenschutzrechtlich geklärt sein.)
                </i>
                <p />

                <CSVFileUpload upload={upload} />
              </div>
            ) : (
              <div>
                Ergebnisse veröffentlicht.{" "}
                <a href={`/results/${id}`} target="_blank">
                  Ansehen ↗
                </a>
              </div>
            )}
          </>
        )}
        <h3>
          Projekte ({Object.keys(options).length}){" "}
          <CSVLink
            separator=";"
            data={downloadProjects()}
            filename={"projects.csv"}
          >
            {"\u{2B73}"}
          </CSVLink>
        </h3>
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={{ width: `${100 / 3}%` }}>Name</th>
              <th style={{ width: `${100 / 3}%` }}>Lehrer</th>
              <th style={{ width: `${100 / 8}%` }}>Max</th>
              {Array.from({ length: selectCount }).map((e, index) => (
                <th
                  style={{
                    width: `${100 / 20}%`,
                  }}
                >
                  {index + 1}. W
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.keys(options).map((e) => (
              <tr>
                <td>{options[e].title}</td>
                <td>{options[e].teacher || "—"}</td>
                <td style={{ textAlign: "center" }}>{options[e].max}</td>
                {Array.from({ length: selectCount }).map((_, index) => (
                  <td
                    style={{
                      textAlign: "center",
                    }}
                  >
                    {
                      Object.keys(choices).filter(
                        (f) => choices[f]["selected"][index] === e
                      ).length
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p />
        <br />
        <h3>
          Wahlen ({Object.keys(choices).length}){" "}
          <CSVLink separator=";" data={downloadVotes()} filename={"votes.csv"}>
            {"\u{2B73}"}
          </CSVLink>
        </h3>
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th
                sortable="true"
                style={{
                  width: `${100 / (2 + selectCount + extraFields?.length)}%`,
                }}
              >
                Klasse
              </th>
              <th
                sortable="true"
                style={{
                  width: `${100 / (2 + selectCount + extraFields?.length)}%`,
                }}
              >
                Name
              </th>
              {Array.from({ length: selectCount }).map((e, index) => (
                <th
                  sortable="true"
                  style={{
                    width: `${100 / (2 + selectCount + extraFields?.length)}%`,
                  }}
                >
                  {index + 1}. Wahl
                </th>
              ))}
              {extraFields?.map((e) => (
                <th
                  sortable="true"
                  style={{
                    width: `${100 / (2 + selectCount + extraFields?.length)}%`,
                  }}
                >
                  {e}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.keys(choices).map((e) => (
              <tr>
                <td>{choices[e].grade}</td>
                <td>{choices[e].name}</td>
                {choices[e].selected.map((e) => (
                  <td>{options[e].title}</td>
                ))}
                {choices[e].extraFields?.map((e) => (
                  <td>{e}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p />
      </div>
      <div style={{ width: "40%", padding: "10px" }}>
        {result ? (
          <div>
            <div style={{ display: "block" }}>
              <h3>
                Zuordnungen{" "}
                {/* <CSVLink
                  separator=";"
                  data={downloadResults()}
                  filename={"results.csv"}
                >
                  {"\u{2B73}"}
                </CSVLink> */}
              </h3>
            </div>
            {notAssigned.map((e) => (
              <div style={{ color: "red" }}>
                {choices[e].name}, {choices[e].grade} Kl. konnte nicht
                zugeordnet werden!
              </div>
            ))}
            <p />
            <table style={{ width: "100%" }}>
              <tbody>
                {Object.keys(result).map((e) => (
                  <>
                    <tr>
                      <td colSpan="4">
                        <b>
                          {result[e]["title"]} (
                          {result[e].members?.length || "0"}/{result[e]["max"]})
                        </b>
                      </td>
                    </tr>
                    {result[e].members?.length > 0 &&
                      result[e].members.map((f) => (
                        <tr>
                          <td>{choices[f]["name"]}</td>
                          <td>{choices[f].selected.indexOf(e) + 1}</td>
                          <td>{choices[f]["grade"]}</td>

                          {choices[f].extraFields?.map((e) => (
                            <td>{e}</td>
                          ))}
                        </tr>
                      ))}
                    <tr>
                      <td colSpan="2">
                        <p />
                      </td>
                    </tr>
                  </>
                ))}
              </tbody>
            </table>
            <button className="button" onClick={() => setResult("")}>
              Bearbeiten
            </button>{" "}
            <CSVLink
              className="secondary"
              separator=";"
              data={downloadResults()}
              filename={"results.csv"}
            >
              Herunterladen
            </CSVLink>
          </div>
        ) : (
          <>
            <AceEditor
              mode="javascript"
              theme="tomorrow"
              onChange={(e) => setCode(e)}
              name="editor"
              width="100%"
              value={code}
              height="50vh"
            />
            <br />
            <button
              onClick={() => eval(code)}
              style={{ width: "100%" }}
              className="button"
            >
              Ausführen
            </button>
          </>
        )}
      </div>
    </div>
  );
}

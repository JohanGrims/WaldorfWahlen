import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore/lite";
import { confirm } from "mdui";
import React from "react";
import { useLoaderData } from "react-router-dom";
import { db } from "../../firebase";

export default function Answers() {
  const { vote, options, answers } = useLoaderData();

  const [mode, setMode] = React.useState("by-option");

  const grades = [...new Set(answers.map((answer) => answer.grade))];

  return (
    <div className="mdui-prose">
      <h2>Antworten</h2>
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
                  answers.filter((answer) => answer.selected[0] === option.id)
                    .length
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
                        {vote.extraFields?.map((field, i) => (
                          <th key={i}>
                            <b>{field}</b>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {answers
                        .filter((answer) => answer.selected[0] === option.id)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((answer, i) => (
                          <tr key={i}>
                            <td>{answer.name}</td>
                            <td>{answer.grade}</td>
                            {vote.extraFields?.map((field, i) => (
                              <td key={i}>{answer.extraFields[i]}</td>
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
        <mdui-tabs
          style={{ width: "100%", overflowX: "auto" }}
          value={grades.sort((a, b) => parseInt(a) - parseInt(b))[0]}
        >
          {grades
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map((grade, i) => (
              <mdui-tab style={{ whiteSpace: "nowrap" }} key={i} value={grade}>
                Klasse {grade}
                <mdui-badge>
                  {answers.filter((answer) => answer.grade === grade).length}
                </mdui-badge>
              </mdui-tab>
            ))}
          {grades.map((grade, i) => (
            <mdui-tab-panel
              slot="panel"
              key={i}
              value={grade}
              style={{ width: "100%", overflowX: "hidden" }}
            >
              <p />
              <div
                style={{
                  padding: "10px",
                  maxWidth: "100%",
                  overflowX: "hidden",
                }}
              >
                <div className="mdui-table" style={{ width: "100%" }}>
                  <table style={{ overflowX: "hidden" }}>
                    <thead>
                      <tr>
                        <th>
                          <b>Name</b>
                        </th>
                        <th>
                          <b>#</b>
                        </th>
                        {Array.from({ length: vote.selectCount }, (_, i) => (
                          <th key={i}>
                            <b>{i + 1}. Wahl</b>
                          </th>
                        ))}

                        {vote.extraFields?.map((field, i) => (
                          <th key={i}>
                            <b>{field}</b>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {answers
                        .filter((answer) => answer.grade === grade)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((answer, i) => (
                          <tr key={i}>
                            <td>{answer.name}</td>
                            <td>{answer.listIndex}</td>
                            {answer.selected.map((selected, i) => (
                              <td key={i}>
                                {
                                  options.find(
                                    (option) => option.id === selected
                                  ).title
                                }
                              </td>
                            ))}
                            {vote.extraFields?.map((field, i) => (
                              <td key={i}>{answer.extraFields[i]}</td>
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

      {mode === "by-name" && (
        <div
          style={{
            padding: "10px",
            maxWidth: "100%",
            overflowX: "hidden",
          }}
        >
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
          <div className="mdui-table" style={{ width: "100%" }}>
            <table style={{ overflowX: "hidden" }}>
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
                  {Array.from({ length: vote.selectCount }, (_, i) => (
                    <th key={i}>
                      <b>{i + 1}. Wahl</b>
                    </th>
                  ))}
                  {vote.extraFields?.map((field, i) => (
                    <th key={i}>
                      <b>{field}</b>
                    </th>
                  ))}
                  <th>
                    <b>ID</b>
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {answers
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((answer, i) => (
                    <tr key={i}>
                      <td>{answer.name}</td>
                      <td>{answer.grade}</td>
                      <td>{answer.listIndex}</td>
                      {answer.selected.map((selected, i) => (
                        <td key={i}>
                          {
                            options.find((option) => option.id === selected)
                              .title
                          }
                        </td>
                      ))}
                      {vote.extraFields?.map((field, i) => (
                        <td key={i}>{answer.extraFields[i]}</td>
                      ))}
                      <td>{answer.id}</td>
                      <td
                        style={{
                          cursor: "pointer",
                          color: "rgb(255, 100, 100)",
                        }}
                        onClick={() => {
                          confirm({
                            headline: "Löschen",
                            description:
                              "Sind Sie sicher, dass Sie diese Antwort löschen möchten?",
                          }).then(() => {
                            // Löschen
                            deleteDoc(
                              doc(db, `/votes/${vote.id}/choices/${answer.id}`)
                            ).then(() => {
                              window.location.reload();
                            });
                          });
                        }}
                      >
                        Löschen
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
  const voteData = vote.data();
  const options = await getDocs(collection(db, `/votes/${id}/options`));
  const optionData = options.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const answers = await getDocs(collection(db, `/votes/${id}/choices`));
  const answerData = answers.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return {
    vote: voteData,
    options: optionData,
    answers: answerData,
  };
}

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { confirm, snackbar } from "mdui";
import React from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import { db } from "../../firebase";

export default function Answers() {
  const { vote, options } = useLoaderData();

  const [loading, setLoading] = React.useState(true);

  const search = new URLSearchParams(window.location.search).get("search");

  const [mode, setMode] = React.useState(search ? "by-name" : "by-option");
  const [answers, setAnswers] = React.useState([]);

  const grades = [...new Set(answers.map((answer) => answer.grade))];

  const navigate = useNavigate();

  React.useEffect(() => {
    let isFirstLoad = true;
    let answersLoad = [];

    const unsubscribe = onSnapshot(
      collection(db, `/votes/${vote.id}/choices`),
      (snapshot) => {
        const answerData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAnswers(answerData);
        setLoading(false);

        if (!isFirstLoad) {
          const newAnswer = answerData.find(
            (newAns) => !answersLoad.some((oldAns) => oldAns.id === newAns.id)
          );
          snackbar({
            message: `Neue Antwort von ${newAnswer.name} (${newAnswer.grade})`,
            timeout: 5000,
            action: "Anzeigen",
            onActionClick: () => {
              setMode("by-name");
              navigate(`.?search=${newAnswer.id}`);
            },
          });
        }
        isFirstLoad = false;
        answersLoad = answerData;
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [vote.id, navigate]);

  React.useEffect(() => {
    if (search && mode === "by-name") {
      const query = search.toLowerCase();
      const elements = document.querySelectorAll("tbody tr");
      elements.forEach((element) => {
        if (element.textContent.toLowerCase().includes(query)) {
          element.style.display = "";
        } else {
          element.style.display = "none";
        }
      });
      // write search query to search field
      const searchField = document.querySelector("mdui-text-field");
      searchField.value = search;
    }
  }, [search, mode, answers]);

  if (loading) {
    return <mdui-linear-progress />;
  }

  return (
    <div className="mdui-prose">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <h2>
          Antworten ({answers.length}){" "}
          <mdui-tooltip
            variant="rich"
            headline="Automatisches Aktualisieren"
            content="Neue Antworten werden automatisch angezeigt."
          >
            <mdui-icon name="autorenew_outlined" />
          </mdui-tooltip>
        </h2>
        <mdui-chip onClick={() => navigate("../match")}>
          Mit Klassenlisten abgleichen
        </mdui-chip>
      </div>
      <br />
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
      <br />

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
                            <td>
                              <a
                                style={{ cursor: "pointer" }}
                                onClick={() => {
                                  setMode("by-name");
                                  navigate(`.?search=${answer.id}`);
                                }}
                              >
                                {answer.name}
                              </a>
                            </td>
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
                        .sort((a, b) => a.listIndex - b.listIndex)
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
              const elements = document.querySelectorAll("tbody tr");
              elements.forEach((element) => {
                if (element.textContent.toLowerCase().includes(query)) {
                  element.style.display = "";
                } else {
                  element.style.display = "none";
                }
              });
              // append search query to URL
              navigate(`.?search=${e.target.value}`);
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

Answers.loader = async function loader({ params }) {
  const { id } = params;
  const vote = await getDoc(doc(db, `/votes/${id}`));
  const voteData = vote.data();
  const options = await getDocs(collection(db, `/votes/${id}/options`));
  const optionData = options.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  // const answers = await getDocs(collection(db, `/votes/${id}/choices`));
  // const answerData = answers.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return {
    vote: voteData,
    options: optionData,
    // answers: answerData,
  };
}

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  Timestamp,
  DocumentData,
} from "firebase/firestore";
import { confirm, prompt, snackbar } from "mdui";
import React from "react";
import {
  useLoaderData,
  useNavigate,
  useRevalidator,
  useParams,
  LoaderFunctionArgs,
} from "react-router-dom";
import { db } from "../../firebase";

interface VoteData extends DocumentData {
  id: string;
  title: string;
  extraFields?: string[];
  selectCount: number;
}

interface OptionData extends DocumentData {
  id: string;
  title: string;
}

interface AnswerData extends DocumentData {
  id: string;
  name: string;
  grade: number | string;
  listIndex: number | string;
  selected: string[];
  extraFields?: string[];
  timestamp: Timestamp;
}

interface LoaderData {
  vote: VoteData;
  options: OptionData[];
}

export default function Answers() {
  const { vote, options } = useLoaderData() as LoaderData;

  const [loading, setLoading] = React.useState<boolean>(true);

  const searchParams = new URLSearchParams(window.location.search);
  const search = searchParams.get("search");
  const grade = searchParams.get("grade");
  const listIndex = searchParams.get("listIndex");

  const revalidator = useRevalidator();

  const [mode, setMode] = React.useState<string>(
    search || grade || listIndex ? "by-name" : "by-option"
  );
  const [answers, setAnswers] = React.useState<AnswerData[]>([]);
  const [editingAnswer, setEditingAnswer] = React.useState<AnswerData | null>(
    null
  );
  const [editMode, setEditMode] = React.useState<"visual" | "json">("visual");

  const grades = [...new Set(answers.map((answer) => answer.grade))];

  const navigate = useNavigate();

  React.useEffect(() => {
    let isFirstLoad = true;
    let answersLoad: AnswerData[] = [];

    console.log("Loading answers for vote:", vote.id);

    const unsubscribe = onSnapshot(
      collection(db, `/votes/${vote.id}/choices`),
      (snapshot) => {
        const answerData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AnswerData[];
        setAnswers(answerData);
        setLoading(false);

        if (!isFirstLoad) {
          const newAnswer = answerData.find(
            (newAns) => !answersLoad.some((oldAns) => oldAns.id === newAns.id)
          );
          if (newAnswer) {
            snackbar({
              message: `Neue Antwort von ${newAnswer.name} (${newAnswer.grade})`,
              action: "Anzeigen",
              autoCloseDelay: 5000,
              onActionClick: () => {
                setMode("by-name");
                navigate(`.?search=${newAnswer.id}`);
              },
            });
          }
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
      elements.forEach((element: Element) => {
        if (element.textContent?.toLowerCase().includes(query)) {
          (element as HTMLElement).style.display = "";
        } else {
          (element as HTMLElement).style.display = "none";
        }
      });
      // write search query to search field
      const searchField = document.querySelector("mdui-text-field");

      if (searchField) {
        (searchField as unknown as HTMLInputElement).value = search;
      }
    }
    if (grade && listIndex && mode === "by-name") {
      const elements = document.querySelectorAll("tbody tr");
      elements.forEach((element: Element) => {
        const gradeCell = element.querySelector("td:nth-child(2)")?.textContent;
        const listIndexCell =
          element.querySelector("td:nth-child(3)")?.textContent;
        if (gradeCell == grade && listIndexCell == listIndex) {
          (element as HTMLElement).style.display = "";
        } else {
          (element as HTMLElement).style.display = "none";
        }
      });
    }
  }, [search, mode, answers, loading, grade, listIndex]);

  async function updateAnswer({
    id,
    data,
  }: {
    id: string;
    data: Partial<AnswerData>;
  }) {
    try {
      await setDoc(doc(db, `/votes/${vote.id}/choices/${id}`), data, {
        merge: true,
      });
      snackbar({
        message: "Antwort erfolgreich aktualisiert.",
        autoCloseDelay: 5000,
      });
      // update the answers
      const newAnswers = answers.map((answer) =>
        answer.id === id ? { ...answer, ...data } : answer
      );
      setAnswers(newAnswers);
    } catch (error) {
      snackbar({
        message: "Fehler beim Aktualisieren der Antwort.",
        autoCloseDelay: 5000,
      });
      console.error(error);
    }
  }

  function openAnswerEditor(answer: AnswerData) {
    setEditingAnswer(answer);
  }

  function closeAnswerEditor() {
    setEditingAnswer(null);
    setEditMode("visual");
  }

  async function saveAnswerChanges(updatedAnswer: AnswerData) {
    const { id, ...data } = updatedAnswer;
    await updateAnswer({ id, data });
    closeAnswerEditor();
  }

  if (loading) {
    return <mdui-linear-progress />;
  }

  if (answers.length === 0 || options.length === 0) {
    return (
      <div
        className="mdui-prose"
        style={{ display: "flex", justifyContent: "center", marginTop: 40 }}
      >
        <mdui-card
          variant="filled"
          style={{ maxWidth: 420, padding: 32, textAlign: "center" }}
        >
          <mdui-icon
            name="sentiment_dissatisfied"
            style={{ fontSize: 64, color: "var(--mdui-color-primary)" }}
          />
          <h2 style={{ marginTop: 16 }}>Keine Antworten gefunden</h2>
          <p />
          <mdui-button icon="refresh" onClick={() => revalidator.revalidate()}>
            Antworten aktualisieren
          </mdui-button>
        </mdui-card>
      </div>
    );
  }

  return (
    <div className="mdui-prose">
      {/* Answer Editor Dialog */}
      {editingAnswer && (
        <mdui-dialog open>
          <div slot="headline">Antwort bearbeiten</div>
          <div slot="description">
            Bearbeiten Sie die Antwort von {editingAnswer.name}
          </div>
          <mdui-button slot="action" variant="text" onClick={closeAnswerEditor}>
            Abbrechen
          </mdui-button>
          <mdui-button
            slot="action"
            variant="filled"
            onClick={() => {
              if (editMode === "visual") {
                // Get form data and save
                const form = document.querySelector(
                  "#answer-edit-form"
                ) as HTMLFormElement;
                const formData = new FormData(form);

                const updatedAnswer: AnswerData = {
                  ...editingAnswer,
                  name: formData.get("name") as string,
                  grade: formData.get("grade") as string,
                  listIndex: parseInt(formData.get("listIndex") as string),
                  selected: Array.from(
                    { length: vote.selectCount },
                    (_, i) => formData.get(`selected_${i}`) as string
                  ).filter(Boolean),
                  extraFields:
                    vote.extraFields?.map(
                      (_, i) => formData.get(`extraField_${i}`) as string
                    ) || [],
                };

                saveAnswerChanges(updatedAnswer);
              } else {
                // JSON mode - get from textarea
                const textarea = document.querySelector(
                  "#json-editor"
                ) as HTMLTextAreaElement;
                try {
                  const data = JSON.parse(textarea.value);
                  updateAnswer({ id: editingAnswer.id, data });
                  closeAnswerEditor();
                } catch (error) {
                  snackbar({
                    message: "Ungültige JSON-Daten.",
                    autoCloseDelay: 5000,
                  });
                }
              }
            }}
          >
            Speichern
          </mdui-button>
          <div style={{ padding: "16px" }}>
            <mdui-radio-group value={editMode} style={{ marginBottom: "16px" }}>
              <mdui-radio value="visual" onClick={() => setEditMode("visual")}>
                Visueller Editor
              </mdui-radio>
              <mdui-radio value="json" onClick={() => setEditMode("json")}>
                JSON Editor
              </mdui-radio>
            </mdui-radio-group>

            {editMode === "visual" ? (
              <form id="answer-edit-form">
                <mdui-text-field
                  label="Name"
                  name="name"
                  value={editingAnswer.name}
                  style={{ width: "100%", marginBottom: "12px" }}
                />

                <div
                  style={{ display: "flex", gap: "12px", marginBottom: "12px" }}
                >
                  <mdui-text-field
                    label="Klasse"
                    name="grade"
                    type="number"
                    value={editingAnswer.grade.toString()}
                    style={{ flex: 1 }}
                  />
                  <mdui-text-field
                    label="Listennummer"
                    name="listIndex"
                    type="number"
                    value={editingAnswer.listIndex.toString()}
                    style={{ flex: 1 }}
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <h4>Wahlen</h4>
                  {Array.from({ length: vote.selectCount }, (_, i) => (
                    <mdui-select
                      key={i}
                      label={`${i + 1}. Wahl`}
                      name={`selected_${i}`}
                      value={editingAnswer.selected[i] || ""}
                      style={{ width: "100%", marginBottom: "8px" }}
                      placement="top"
                    >
                      <mdui-menu-item value="">Keine Auswahl</mdui-menu-item>
                      {options.map((option) => (
                        <mdui-menu-item key={option.id} value={option.id}>
                          {option.title}
                        </mdui-menu-item>
                      ))}
                    </mdui-select>
                  ))}
                </div>

                {vote.extraFields && vote.extraFields.length > 0 && (
                  <div>
                    <h4>Zusätzliche Felder</h4>
                    {vote.extraFields.map((field, i) => (
                      <mdui-text-field
                        key={i}
                        label={field}
                        name={`extraField_${i}`}
                        value={editingAnswer.extraFields?.[i] || ""}
                        style={{ width: "100%", marginBottom: "8px" }}
                      />
                    ))}
                  </div>
                )}
              </form>
            ) : (
              <mdui-text-field
                id="json-editor"
                label="JSON-Daten"
                rows={15}
                autosize
                value={JSON.stringify(editingAnswer, null, 2)}
                style={{ width: "100%" }}
              />
            )}
          </div>
        </mdui-dialog>
      )}

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
        <mdui-radio value="by-date" onClick={() => setMode("by-date")}>
          Nach Datum
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
                              <div
                                style={{
                                  display: "flex",
                                  gap: "8px",
                                  alignItems: "center",
                                }}
                              >
                                <a
                                  style={{ cursor: "pointer" }}
                                  onClick={() => {
                                    setMode("by-name");
                                    navigate(`.?search=${answer.id}`);
                                  }}
                                >
                                  {answer.name}
                                </a>
                                <mdui-icon
                                  name="edit"
                                  style={{
                                    fontSize: "16px",
                                    cursor: "pointer",
                                    color:
                                      "rgb(var(--mdui-color-tertiary-dark))",
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAnswerEditor(answer);
                                  }}
                                />
                              </div>
                            </td>
                            <td>{answer.grade}</td>
                            {vote.extraFields?.map((field, i) => (
                              <td key={i}>{answer.extraFields?.[i]}</td>
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
          value={grades
            .sort((a, b) => parseInt(a.toString()) - parseInt(b.toString()))[0]
            ?.toString()}
        >
          {grades
            .sort((a, b) => parseInt(a.toString()) - parseInt(b.toString()))
            .map((grade, i) => (
              <mdui-tab
                style={{ whiteSpace: "nowrap" }}
                key={i}
                value={grade.toString()}
              >
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
              value={grade.toString()}
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
                        .sort(
                          (a, b) => Number(a.listIndex) - Number(b.listIndex)
                        )
                        .map((answer, i) => (
                          <tr key={i}>
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "8px",
                                  alignItems: "center",
                                }}
                              >
                                <a
                                  style={{ cursor: "pointer" }}
                                  onClick={() => {
                                    setMode("by-name");
                                    navigate(`.?search=${answer.id}`);
                                  }}
                                >
                                  {answer.name}
                                </a>
                                <mdui-icon
                                  name="edit"
                                  style={{
                                    fontSize: "16px",
                                    cursor: "pointer",
                                    color:
                                      "rgb(var(--mdui-color-tertiary-dark))",
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAnswerEditor(answer);
                                  }}
                                />
                              </div>
                            </td>
                            <td>{answer.grade}</td>
                            <td>{answer.listIndex}</td>
                            {answer.selected.map((selected, i) => (
                              <td key={i}>
                                {
                                  options.find(
                                    (option) => option.id === selected
                                  )?.title
                                }
                              </td>
                            ))}
                            {vote.extraFields?.map((field, i) => (
                              <td key={i}>{answer.extraFields?.[i]}</td>
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
            onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
              const query = e.target.value.toLowerCase();
              const elements = document.querySelectorAll("tbody tr");
              elements.forEach((element: Element) => {
                if (element.textContent?.toLowerCase().includes(query)) {
                  (element as HTMLElement).style.display = "";
                } else {
                  (element as HTMLElement).style.display = "none";
                }
              });
              // append search query to URL
              navigate(`.?search=${e.target.value}`);
            }}
          ></mdui-text-field>
          {grade && listIndex && (
            <>
              <p />
              <mdui-chip selectable selected disabled>
                {`Klasse ${grade}, #${listIndex}`}
              </mdui-chip>
            </>
          )}
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
                    <b>Antwort-Id</b>
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
                              ?.title
                          }
                        </td>
                      ))}
                      {vote.extraFields?.map((field, i) => (
                        <td key={i}>{answer.extraFields?.[i]}</td>
                      ))}
                      <td>{answer.id}</td>
                      <td
                        style={{
                          cursor: "pointer",
                          color: "rgb(var(--mdui-color-tertiary-dark))",
                        }}
                        onClick={() => openAnswerEditor(answer)}
                      >
                        Bearbeiten
                      </td>
                      <td
                        style={{
                          cursor: "pointer",
                          color: "rgb(var(--mdui-color-primary-dark))",
                        }}
                        onClick={() => {
                          confirm({
                            icon: "delete",
                            headline: "Löschen",
                            description:
                              "Sind Sie sicher, dass Sie diese Antwort löschen möchten?",
                            confirmText: "Löschen",
                            cancelText: "Abbrechen",
                            onConfirm: () => {
                              deleteDoc(
                                doc(
                                  db,
                                  `/votes/${vote.id}/choices/${answer.id}`
                                )
                              ).then(() => {
                                snackbar({
                                  message: "Antwort erfolgreich gelöscht.",
                                  autoCloseDelay: 5000,
                                });
                                revalidator.revalidate();
                              });
                            },
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

      {mode === "by-date" && (
        <div style={{ padding: "10px" }}>
          <div className="mdui-prose">
            Hinweis: Als Datenschutzmaßnahme wird die Uhrzeit vorerst nicht
            angezeigt. Die Antworten sind nach der Uhrzeit sortiert. Erst beim
            Klicken auf das Datum wird die Uhrzeit sichtbar. Diese Ansicht kann
            Ihnen helfen, sich einen Überblick über die letzten Antworten zu
            verschaffen.
          </div>
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
                    <b>Datum</b>
                  </th>
                </tr>
              </thead>
              <tbody>
                {answers
                  .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds)
                  .map((answer, i) => (
                    <tr key={answer.id}>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                          }}
                        >
                          <a
                            style={{ cursor: "pointer" }}
                            onClick={() => {
                              setMode("by-name");
                              navigate(`.?search=${answer.id}`);
                            }}
                          >
                            {answer.name}
                          </a>
                          <mdui-icon
                            name="edit"
                            style={{
                              fontSize: "16px",
                              cursor: "pointer",
                              color: "rgb(var(--mdui-color-tertiary-dark))",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openAnswerEditor(answer);
                            }}
                          />
                        </div>
                      </td>
                      <td>{answer.grade}</td>
                      <td>
                        <mdui-tooltip
                          content={new Date(
                            answer.timestamp.seconds * 1000
                          ).toLocaleString("de-DE")}
                          trigger="click"
                        >
                          <span>
                            {new Date(
                              answer.timestamp.seconds * 1000
                            ).toLocaleDateString("de-DE")}
                          </span>
                        </mdui-tooltip>
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

Answers.loader = async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params as { id: string };
  const vote = await getDoc(doc(db, `/votes/${id}`));
  const voteData = { id, ...vote.data() } as VoteData;
  const options = await getDocs(collection(db, `/votes/${id}/options`));
  const optionData = options.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as OptionData[];
  return {
    vote: voteData,
    options: optionData,
  };
};

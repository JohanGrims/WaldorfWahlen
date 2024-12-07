import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { confirm, prompt } from "mdui";
import React, { useRef } from "react";
import { useLoaderData, useNavigate, useParams } from "react-router-dom";
import { db } from "../firebase";
import { Class } from "../types";

import * as XLSX from "xlsx";

export default function Students() {
  const { classes } = useLoaderData() as { classes: Class[] };

  const { classId, edit } = useParams();

  const navigate = useNavigate();

  const sortedClasses = classes.sort((a, b) => a.grade - b.grade);

  const [newClass, setNewClass] = React.useState({
    grade: 7,
    students: [],
  } as Class);

  const [updatedStudents, setUpdatedStudents] = React.useState("[]");

  const [updateMethod, setUpdateMethod] = React.useState("by-text");

  const fileInputRef = useRef<HTMLInputElement>(null);

  function uploadStudents(event) {
    console.log(event.target.files);
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const students = XLSX.utils.sheet_to_json(sheet);
      setNewClass((cl) => ({ ...cl, students }));
    };
    reader.readAsArrayBuffer(file);
  }

  function updateStudents(event) {
    console.log(event.target.files);
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const students = XLSX.utils.sheet_to_json(sheet);
      setUpdatedStudents(JSON.stringify(students, null, 2));
      if (classId) {
        updateClass(classId, { students }, true);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function addClass() {
    const classDoc = await setDoc(doc(collection(db, "class")), newClass);
    location.reload();
  }

  async function removeClass(classId: string) {
    confirm({
      headline: "Klasse löschen",
      description:
        "Möchten Sie wirklich diese Klasse löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
      confirmText: "Ja, löschen",
      cancelText: "Abbrechen",
      onConfirm: async () => {
        const ref = doc(db, "class", classId);
        await deleteDoc(ref);
        location.reload();
      },
    });
  }

  async function updateClass(
    classId: string,
    updatedClass: Partial<Class>,
    goBack = false
  ) {
    const classDocRef = doc(db, "class", classId);
    await updateDoc(classDocRef, updatedClass);
    if (goBack) {
      navigate(`/admin/students/${classId}`);
    }
  }

  async function upgradeClasses() {
    if (
      !confirm({
        headline: "Schuljahr wechseln",
        description:
          "Möchten Sie wirklich das Schuljahr wechseln? Alle Klassen werden hochgestuft. Diese Aktion kann nicht rückgängig gemacht werden.",
        confirmText: "Ja, wechseln",
        cancelText: "Abbrechen",
        onConfirm: async () => {
          await Promise.all(
            classes.map((c) => {
              if (c.id) {
                return updateDoc(doc(db, "class", c.id), {
                  grade: c.grade + 1,
                });
              }
              return Promise.resolve();
            })
          );

          location.reload();
        },
      })
    )
      return;
  }

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  React.useEffect(() => {
    setUpdatedStudents(
      JSON.stringify(
        classes.find((c) => c.id === classId)?.students || "[]",
        null,
        2
      )
    );
  }, [classId, classes]);

  if (edit === "true") {
    return (
      <div className="mdui-prose">
        <h2>
          {classes.find((c) => c.id === classId)?.grade}. Klasse bearbeiten
        </h2>
        <mdui-radio-group value={updateMethod}>
          <mdui-radio
            value="by-text"
            onClick={() => setUpdateMethod("by-text")}
          >
            Text-Editor
          </mdui-radio>
          <mdui-radio
            value="by-file"
            onClick={() => setUpdateMethod("by-file")}
          >
            Hochladen
          </mdui-radio>
        </mdui-radio-group>

        {updateMethod === "by-text" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (classId) {
                console.log(updatedStudents);
                updateClass(classId, {
                  students: JSON.parse(updatedStudents),
                }).then(() => navigate(`/admin/students/${classId}`));
              }
            }}
          >
            <mdui-text-field
              rows={15}
              label="JSON-Daten"
              value={updatedStudents}
              onInput={(e) => setUpdatedStudents(e.target.value)}
            />
            <p />
            <div style={{ display: "flex", gap: "10px" }}>
              <mdui-button
                variant="tonal"
                onClick={() => navigate(`/admin/students/${classId}`)}
              >
                Abbrechen
              </mdui-button>
              <mdui-button type="submit">Speichern</mdui-button>
            </div>
          </form>
        )}
        {updateMethod === "by-file" && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={updateStudents}
              accept=".xlsx"
            />
            <mdui-tooltip
              content="Bitte stellen Sie sicher, dass die Datei im .xlsx-Format vorliegt und das Format wie folgt ist: 1. Zeile — name | listIndex als Überschrift, danach für jede Zeile die individuellen Daten. Die Reihenfolge der Spalten ist nicht relevant. Es wird immer nur das erste Tabellenblatt gelesen."
              headline="Hinweis"
              variant="rich"
            >
              <mdui-button
                onClick={handleButtonClick}
                variant="outlined"
                icon="upload_file"
              >
                SchülerInnen importieren
              </mdui-button>
            </mdui-tooltip>
          </div>
        )}
      </div>
    );
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
        <h2>SchülerInnen</h2>
        <mdui-tooltip
          content="Alle Klassen werden um ein Schuljahr erhöht. Diese Aktion kann nicht rückgängig gemacht werden. Ausgelaufene Klassen werden nicht gelöscht."
          headline="Neues Schuljahr"
          variant="rich"
        >
          <mdui-button icon="trending_up" onClick={upgradeClasses}>
            Schuljahr wechseln
          </mdui-button>
        </mdui-tooltip>
      </div>
      <mdui-tabs
        value={
          classId || (sortedClasses.length < 1 ? "add" : sortedClasses[0].id)
        }
      >
        {sortedClasses.map((c) => (
          <mdui-tab
            value={c.id}
            onClick={() => {
              navigate(`/admin/students/${c.id}`);
            }}
          >
            Klasse {c.grade}
            <mdui-badge>{c.students.length}</mdui-badge>
          </mdui-tab>
        ))}
        <mdui-tab
          value="add"
          icon="add"
          inline
          onClick={() => {
            navigate(`/admin/students/add`);
          }}
        >
          Hinzufügen
        </mdui-tab>
        <div
          style={{
            flex: "1",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          {classId !== "add" ? (
            <mdui-segmented-button-group>
              <mdui-segmented-button
                icon="edit"
                onClick={() => {
                  navigate(`/admin/students/${classId}/true`);
                }}
              ></mdui-segmented-button>
              <mdui-segmented-button
                icon="delete"
                onClick={() => classId && removeClass(classId)}
              ></mdui-segmented-button>
            </mdui-segmented-button-group>
          ) : (
            <mdui-segmented-button-group disabled>
              <mdui-segmented-button
                icon="delete"
                onClick={() => removeClass(classId)}
              ></mdui-segmented-button>
              <mdui-segmented-button
                icon="edit"
                onClick={() => {
                  const newGrade = prompt({
                    headline: "Klassenstufe ändern",
                    description: "Bitte geben Sie die neue Klassenstufe ein.",
                    confirmText: "Speichern",
                    cancelText: "Abbrechen",
                    textFieldOptions: {
                      defaultValue: classes
                        .find((c) => c.id === classId)
                        ?.grade.toString(),
                    },
                  });
                  if (newGrade) {
                    updateClass(classId, { grade: Number(newGrade) });
                  }
                }}
              ></mdui-segmented-button>
            </mdui-segmented-button-group>
          )}
        </div>
        {sortedClasses.map((c) => (
          <mdui-tab-panel slot="panel" value={c.id}>
            <div style={{ padding: "10px" }}>
              <div className="mdui-table" style={{ width: "100%" }}>
                <table>
                  <thead>
                    <tr>
                      <th>
                        <b>Name</b>
                      </th>
                      <th>
                        <b>#</b>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.students
                      .sort((a, b) => Number(a.listIndex) - Number(b.listIndex))
                      .map((s) => (
                        <tr>
                          <td>{s.name}</td>
                          <td>{s.listIndex}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </mdui-tab-panel>
        ))}
        <mdui-tab-panel slot="panel" value="add">
          <div style={{ padding: "10px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <mdui-text-field
                label="Klasse"
                placeholder="7"
                value={newClass.grade.toString()}
                onInput={(e) =>
                  setNewClass((cl) => ({ ...cl, grade: e.target.value }))
                }
              />
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={uploadStudents}
                accept=".xlsx"
              />
              <mdui-tooltip
                content="Bitte stellen Sie sicher, dass die Datei im .xlsx-Format vorliegt und das Format wie folgt ist: 1. Zeile — name | listIndex als Überschrift, danach für jede Zeile die individuellen Daten. Die Reihenfolge der Spalten ist nicht relevant. Es wird immer nur das erste Tabellenblatt gelesen."
                headline="Hinweis"
                variant="rich"
              >
                <mdui-button
                  onClick={handleButtonClick}
                  variant="outlined"
                  icon="upload_file"
                >
                  SchülerInnen importieren
                </mdui-button>
              </mdui-tooltip>
            </div>
            <p />
            {newClass.students.length > 0 && (
              <div className="mdui-table" style={{ width: "100%" }}>
                <table>
                  <thead>
                    <tr>
                      <th>
                        <b>Name</b>
                      </th>
                      <th>
                        <b>#</b>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {newClass.students.map((s, i) => (
                      <tr>
                        <td>{s.name}</td>
                        <td>{s.listIndex}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <mdui-button icon="add" onClick={addClass}>
              Klasse speichern
            </mdui-button>
          </div>
        </mdui-tab-panel>
      </mdui-tabs>
    </div>
  );
}

Students.loader = async function loader() {
  const classes = await getDocs(collection(db, "class"));
  return {
    classes: classes.docs.map((e) => {
      return {
        id: e.id,
        ...e.data(),
      };
    }),
  };
};

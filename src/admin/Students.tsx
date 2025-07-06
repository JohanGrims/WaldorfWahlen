import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { confirm, prompt } from "mdui";
import React, { useRef } from "react";
import {
  useLoaderData,
  useNavigate,
  useParams,
  useRevalidator,
} from "react-router-dom";
import { db } from "../firebase";
import { Class, Student } from "../types";

import * as XLSX from "xlsx";
import { Helmet } from "react-helmet";
export default function Students() {
  const { classes } = useLoaderData() as { classes: Class[] };

  const { classId, edit } = useParams();

  const navigate = useNavigate();

  const revalidator = useRevalidator();

  const sortedClasses = classes.sort((a, b) => a.grade - b.grade);

  const [newClass, setNewClass] = React.useState({
    grade: 7,
    students: [],
  } as Class);

  const [updatedStudents, setUpdatedStudents] = React.useState("[]");

  const [updateMethod, setUpdateMethod] = React.useState("by-text");
  const [editingStudent, setEditingStudent] = React.useState<Student | null>(
    null
  );
  const [editingClassId, setEditingClassId] = React.useState<string | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  function uploadStudents(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (!e.target) return;
      const data = new Uint8Array(e.target.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const students = XLSX.utils.sheet_to_json(sheet);
      setNewClass((cl) => ({ ...cl, students: students as Student[] }));
    };
    reader.readAsArrayBuffer(file);
  }

  function updateStudents(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (!e.target) return;
      const data = new Uint8Array(e.target.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const students = XLSX.utils.sheet_to_json(sheet);
      setUpdatedStudents(JSON.stringify(students, null, 2));
      if (classId) {
        updateClass(classId, { students: students as Student[] }, true);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function addClass() {
    const classDocRef = await addDoc(collection(db, "class"), newClass);

    revalidator.revalidate();

    navigate(`/admin/students/${classDocRef.id}`);
  }

  async function removeClass(classId: string) {
    confirm({
      icon: "warning",
      headline: "Klasse löschen",
      description:
        "Möchten Sie wirklich diese Klasse löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
      confirmText: "Ja, löschen",
      cancelText: "Abbrechen",
      onConfirm: async () => {
        const ref = doc(db, "class", classId);
        await deleteDoc(ref);
        revalidator.revalidate();

        navigate(`/admin/students/new-class`);
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

  function openStudentEditor(student: Student, classId: string) {
    setEditingStudent(student);
    setEditingClassId(classId);
  }

  function closeStudentEditor() {
    setEditingStudent(null);
    setEditingClassId(null);
  }

  async function saveStudentChanges(updatedStudent: Student) {
    if (!editingClassId) return;

    const currentClass = classes.find((c) => c.id === editingClassId);
    if (!currentClass) return;

    const updatedStudents = currentClass.students.map((student) =>
      student === editingStudent ? updatedStudent : student
    );

    await updateClass(editingClassId, { students: updatedStudents });
    revalidator.revalidate();
    closeStudentEditor();
  }

  async function deleteStudent(studentToDelete: Student, classId: string) {
    const currentClass = classes.find((c) => c.id === classId);
    if (!currentClass) return;

    const updatedStudents = currentClass.students.filter(
      (student) => student !== studentToDelete
    );
    await updateClass(classId, { students: updatedStudents });
    revalidator.revalidate();
  }

  async function addNewStudent(classId: string) {
    const name = await prompt({
      icon: "person_add",
      headline: "SchülerIn hinzufügen",
      description: "Geben Sie die Daten der neuen SchülerIn ein.",
      confirmText: "Hinzufügen",
      cancelText: "Abbrechen",
      textFieldOptions: {
        label: "Name",
        placeholder: "Max Mustermann",
      },
    });

    if (!name) return;

    const listIndex = await prompt({
      icon: "numbers",
      headline: "Listennummer",
      description: "Geben Sie die Listennummer ein.",
      confirmText: "Hinzufügen",
      cancelText: "Abbrechen",
      textFieldOptions: {
        label: "Listennummer",
        placeholder: "1",
      },
    });

    if (!listIndex) return;

    const email = await prompt({
      icon: "email",
      headline: "E-Mail (optional)",
      description: "Geben Sie die E-Mail-Adresse ein (optional).",
      confirmText: "Hinzufügen",
      cancelText: "Überspringen",
      textFieldOptions: {
        label: "E-Mail",
        placeholder: "max.mustermann@example.com",
        type: "email",
      },
    });

    const currentClass = classes.find((c) => c.id === classId);
    if (!currentClass) return;

    const newStudent: Student = {
      name,
      listIndex,
      ...(email && { email }),
    };
    const updatedStudents = [...currentClass.students, newStudent];

    await updateClass(classId, { students: updatedStudents });
    revalidator.revalidate();
  }

  async function upgradeClasses() {
    if (
      !confirm({
        icon: "warning",
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

          revalidator.revalidate();
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
        <Helmet>
          <title>Klasse bearbeiten - WaldorfWahlen</title>
        </Helmet>
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
              onInput={(e) =>
                setUpdatedStudents((e.target as HTMLTextAreaElement).value)
              }
            />
            <p />
            <div className="flex-gap">
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
              aria-label="Datei auswählen"
              type="file"
              ref={fileInputRef}
              onChange={updateStudents}
              accept=".xlsx"
              className="no-display"
            />
            <mdui-tooltip
              content="Bitte stellen Sie sicher, dass die Datei im .xlsx-Format vorliegt und das Format wie folgt ist: 1. Zeile — name | listIndex | email (optional) als Überschrift, danach für jede Zeile die individuellen Daten. Die Reihenfolge der Spalten ist nicht relevant. Es wird immer nur das erste Tabellenblatt gelesen."
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
      <Helmet>
        <title>SchülerInnen - WaldorfWahlen</title>
      </Helmet>

      {/* Student Editor Dialog */}
      {editingStudent && (
        <mdui-dialog open>
          <div slot="headline">SchülerIn bearbeiten</div>
          <div slot="description">
            Bearbeiten Sie die Daten von {editingStudent.name}
          </div>
          <mdui-button
            slot="action"
            variant="text"
            onClick={closeStudentEditor}
          >
            Abbrechen
          </mdui-button>
          <mdui-button
            slot="action"
            variant="filled"
            onClick={() => {
              const form = document.querySelector(
                "#student-edit-form"
              ) as HTMLFormElement;
              const formData = new FormData(form);

              const updatedStudent: Student = {
                name: formData.get("name") as string,
                listIndex: formData.get("listIndex") as string,
                email: (formData.get("email") as string) || undefined,
              };

              saveStudentChanges(updatedStudent);
            }}
          >
            Speichern
          </mdui-button>
          <div style={{ padding: "16px" }}>
            <form id="student-edit-form">
              <mdui-text-field
                label="Name"
                name="name"
                value={editingStudent.name}
                style={{ width: "100%", marginBottom: "12px" }}
                required
              />

              <mdui-text-field
                label="Listennummer"
                name="listIndex"
                value={editingStudent.listIndex.toString()}
                style={{ width: "100%", marginBottom: "12px" }}
                required
              />

              <mdui-text-field
                label="E-Mail"
                name="email"
                type="email"
                value={editingStudent.email || ""}
                placeholder="max.mustermann@example.com"
                style={{ width: "100%", marginBottom: "12px" }}
              />
            </form>
          </div>
        </mdui-dialog>
      )}

      <div className="flex-gap justify-between">
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
          classId ||
          (sortedClasses.length < 1 ? "new-class" : sortedClasses[0].id)
        }
        style={{ width: "100%", overflowX: "auto" }}
      >
        {sortedClasses.map((c) => (
          <mdui-tab
            value={c.id}
            style={{ whiteSpace: "nowrap" }}
            onClick={() => {
              navigate(`/admin/students/${c.id}`);
            }}
          >
            Klasse {c.grade}
            <mdui-badge>{c.students.length}</mdui-badge>
          </mdui-tab>
        ))}
        <mdui-tab
          value="new-class"
          style={{ whiteSpace: "nowrap" }}
          icon="add"
          inline
          onClick={() => {
            navigate(`/admin/students/new-class`);
          }}
        >
          Hinzufügen
        </mdui-tab>
        <div className="justify-end">
          {classId !== "new-class" ? (
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
                icon="edit"
                onClick={() => {
                  const newGrade = prompt({
                    icon: "edit",
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
              <mdui-segmented-button
                icon="delete"
                onClick={() => removeClass(classId)}
              ></mdui-segmented-button>
            </mdui-segmented-button-group>
          )}
        </div>
        {sortedClasses.map((c) => (
          <mdui-tab-panel slot="panel" value={c.id}>
            <div className="p-10">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <h3 style={{ margin: 0 }}>
                  Klasse {c.grade} ({c.students.length} SchülerInnen)
                </h3>
                <mdui-button
                  icon="person_add"
                  variant="outlined"
                  onClick={() => addNewStudent(c.id!)}
                >
                  SchülerIn hinzufügen
                </mdui-button>
              </div>
              <div className="mdui-table w-100">
                <table>
                  <thead>
                    <tr>
                      <th>
                        <b>Name</b>
                      </th>
                      <th>
                        <b>#</b>
                      </th>
                      <th>
                        <b>E-Mail</b>
                      </th>
                      <th>
                        <b>Aktionen</b>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.students
                      .sort((a, b) => Number(a.listIndex) - Number(b.listIndex))
                      .map((s, i) => (
                        <tr key={i}>
                          <td>{s.name}</td>
                          <td>{s.listIndex}</td>
                          <td>{s.email || "-"}</td>
                          <td>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <mdui-icon
                                name="edit"
                                style={{
                                  fontSize: "16px",
                                  cursor: "pointer",
                                  color: "rgb(var(--mdui-color-tertiary-dark))",
                                }}
                                onClick={() => openStudentEditor(s, c.id!)}
                              />
                              <mdui-icon
                                name="delete"
                                style={{
                                  fontSize: "16px",
                                  cursor: "pointer",
                                  color: "rgb(var(--mdui-color-error-dark))",
                                }}
                                onClick={() => {
                                  confirm({
                                    icon: "delete",
                                    headline: "SchülerIn löschen",
                                    description: `Möchten Sie ${s.name} wirklich aus der ${c.grade}. Klasse löschen?`,
                                    confirmText: "Löschen",
                                    cancelText: "Abbrechen",
                                    onConfirm: () => deleteStudent(s, c.id!),
                                  });
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </mdui-tab-panel>
        ))}
        <mdui-tab-panel slot="panel" value="new-class">
          <div className="p-10">
            <div className="align-center">
              <mdui-text-field
                label="Klasse"
                placeholder="7"
                value={newClass.grade.toString()}
                onInput={(e) =>
                  setNewClass((cl) => ({
                    ...cl,
                    grade: Number((e.target as HTMLInputElement).value),
                  }))
                }
              />
              <input
                aria-label="Datei auswählen"
                type="file"
                ref={fileInputRef}
                onChange={uploadStudents}
                accept=".xlsx"
                className="no-display"
              />
              <mdui-tooltip
                content="Bitte stellen Sie sicher, dass die Datei im .xlsx-Format vorliegt und das Format wie folgt ist: 1. Zeile — name | listIndex | email (optional) als Überschrift, danach für jede Zeile die individuellen Daten. Die Reihenfolge der Spalten ist nicht relevant. Es wird immer nur das erste Tabellenblatt gelesen."
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
              <div className="mdui-table w-100">
                <table>
                  <thead>
                    <tr>
                      <th>
                        <b>Name</b>
                      </th>
                      <th>
                        <b>#</b>
                      </th>
                      <th>
                        <b>E-Mail</b>
                      </th>
                      <th>
                        <b>Aktionen</b>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {newClass.students.map((s, i) => (
                      <tr key={i}>
                        <td>{s.name}</td>
                        <td>{s.listIndex}</td>
                        <td>{s.email || "-"}</td>
                        <td>
                          <mdui-icon
                            name="delete"
                            style={{
                              fontSize: "16px",
                              cursor: "pointer",
                              color: "rgb(var(--mdui-color-error-dark))",
                            }}
                            onClick={() => {
                              const updatedStudents = newClass.students.filter(
                                (_, index) => index !== i
                              );
                              setNewClass((cl) => ({
                                ...cl,
                                students: updatedStudents,
                              }));
                            }}
                          />
                        </td>
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

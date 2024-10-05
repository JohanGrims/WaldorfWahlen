import { collection, doc, getDocs, updateDoc } from "firebase/firestore/lite";
import { confirm } from "mdui";
import React from "react";
import { useLoaderData } from "react-router-dom";
import { db } from "../firebase";
import { Class } from "../types";

export default function Students() {
  const { classes } = useLoaderData() as { classes: Class[] };

  const sortedClasses = classes.sort((a, b) => a.grade - b.grade);

  const [newClass, setNewClass] = React.useState({
    grade: 7,
    students: [],
  } as Class);

  function addClass() {}

  function uploadStudents() {}

  function removeClass() {}

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
        <h2>Zuteilung</h2>
        <mdui-button icon="trending_up" onClick={upgradeClasses}>
          Schuljahr wechseln
        </mdui-button>
      </div>
      <mdui-tabs value={sortedClasses[0].id}>
        {sortedClasses.map((c) => (
          <mdui-tab value={c.id}>
            Klasse {c.grade}
            <mdui-badge>{c.students.length}</mdui-badge>
          </mdui-tab>
        ))}
        <mdui-tab value="add" icon="add" inline>
          Hinzufügen
        </mdui-tab>

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
              <mdui-button variant="outlined" icon="upload_file">
                SchülerInnen importieren
              </mdui-button>
            </div>
            <p />
          </div>
        </mdui-tab-panel>
      </mdui-tabs>
    </div>
  );
}

export async function loader() {
  const classes = await getDocs(collection(db, "class"));
  return {
    classes: classes.docs.map((e) => {
      return {
        id: e.id,
        ...e.data(),
      };
    }),
  };
}

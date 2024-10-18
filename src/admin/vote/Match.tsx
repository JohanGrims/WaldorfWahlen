import { collection, getDocs } from "firebase/firestore/lite";
import React from "react";
import { useLoaderData } from "react-router-dom";
import { db } from "../../firebase";
import { Class } from "../../types";

export default function Match() {
  const { choices, classes } = useLoaderData() as {
    classes: Class[];
    choices: any[];
  };

  const sortedClasses = classes.sort((a, b) => a.grade - b.grade);
  return (
    <div className="mdui-prose">
      <h2>Abgleichen</h2>
      <mdui-tabs value={sortedClasses[0].id}>
        {sortedClasses.map((c) => (
          <mdui-tab value={c.id}>
            Klasse {c.grade}
            <mdui-badge>{c.students.length}</mdui-badge>
          </mdui-tab>
        ))}
        <p />
        {sortedClasses.map((c) => (
          <mdui-tab-panel slot="panel" value={c.id}>
            <div style={{ padding: "10px" }}>
              <div className="mdui-table">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>#</th>
                      <th>Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.students.map((s) => (
                      <tr>
                        <td>{s.name}</td>
                        <td>{s.listIndex}</td>
                        <td>
                          {
                            choices.filter(
                              (choice) =>
                                choice.listIndex === s.listIndex.toString() &&
                                choice.grade === c.grade.toString()
                            )[0]?.name
                          }
                          {choices.filter(
                            (choice) =>
                              choice.listIndex === s.listIndex.toString() &&
                              choice.grade === c.grade.toString()
                          ).length > 1 &&
                            "+ " +
                              (choices.filter(
                                (choice) =>
                                  choice.listIndex === s.listIndex.toString() &&
                                  choice.grade === c.grade.toString()
                              ).length -
                                1) +
                              " weitere"}
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
    </div>
  );
}

export async function loader({ params }) {
  const { id } = params;
  const choices = await getDocs(collection(db, `/votes/${id}/choices`));
  const choiceData = choices.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const classes = await getDocs(collection(db, `/class`));
  const classData = classes.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return {
    choices: choiceData,
    classes: classData,
  };
}

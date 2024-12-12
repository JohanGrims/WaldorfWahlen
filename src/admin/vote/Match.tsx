import { collection, getDocs } from "firebase/firestore";
import React from "react";
import { Link, useLoaderData } from "react-router-dom";
import { db } from "../../firebase";
import { Class } from "../../types";

export default function Match() {
  const { choices, classes } = useLoaderData() as {
    classes: Class[];
    choices: any[];
  };

  const [mode, setMode] = React.useState("database");

  const sortedClasses = classes.sort((a, b) => a.grade - b.grade);

  return (
    <div className="mdui-prose">
      <h2>Abgleichen</h2>
      <mdui-radio-group value={mode}>
        <mdui-radio value="database" onClick={() => setMode("database")}>
          Datenbank
        </mdui-radio>
        <mdui-radio value="answers" onClick={() => setMode("answers")}>
          Antworten
        </mdui-radio>
      </mdui-radio-group>

      {mode === "database" && (
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
              <div className="p-10">
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
                            <Link
                              to={`../answers?grade=${c.grade}&listIndex=${s.listIndex}`}
                            >
                              {
                                choices.filter(
                                  (choice) =>
                                    choice.listIndex ===
                                      s.listIndex.toString() &&
                                    choice.grade === c.grade.toString()
                                )[0]?.name
                              }
                              {choices.filter(
                                (choice) =>
                                  choice.listIndex === s.listIndex.toString() &&
                                  choice.grade === c.grade.toString()
                              ).length > 1 &&
                                " + " +
                                  (choices.filter(
                                    (choice) =>
                                      choice.listIndex ===
                                        s.listIndex.toString() &&
                                      choice.grade === c.grade.toString()
                                  ).length -
                                    1) +
                                  " weitere"}
                            </Link>
                            {choices.filter(
                              (choice) =>
                                choice.listIndex === s.listIndex.toString() &&
                                choice.grade === c.grade.toString()
                            ).length < 1 && (
                              <Link
                                to={`../add?name=${s.name}&grade=${c.grade}&listIndex=${s.listIndex}`}
                                style={{ color: "rgb(255, 100, 100)" }}
                              >
                                (Erstellen)
                              </Link>
                            )}
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

      {mode === "answers" && (
        <div>
          <div className="mdui-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>#</th>
                  <th>Klasse</th>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {choices
                  .sort((a, b) => {
                    if (a.grade === b.grade) {
                      return a.listIndex - b.listIndex;
                    }
                    return a.grade - b.grade;
                  })
                  .map((choice) => (
                    <tr key={choice.id}>
                      <td>
                        <Link to={`../answers?search=${choice.id}`}>
                          {choice.name}
                        </Link>
                      </td>
                      <td>{choice.listIndex}</td>
                      <td>{choice.grade}</td>
                      <td>
                        {
                          sortedClasses
                            .find(
                              (c) => Number(c.grade) === Number(choice.grade)
                            )
                            ?.students.find(
                              (s) =>
                                Number(s.listIndex) === Number(choice.listIndex)
                            )?.name
                        }
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

Match.loader =  async function loader({ params }) {
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

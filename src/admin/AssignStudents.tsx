import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore/lite";
import React, { useState } from "react";
import { useLoaderData } from "react-router-dom";
import { db } from "../firebase";
import { Choice, Option, Vote } from "../types";
import CSVFileUpload from "./FileUpload";

export default function AssignStudents() {
  const { vote, choices, options } = useLoaderData() as {
    vote: Vote;
    choices: Choice[];
    options: Option[];
  };
  const [assignments, setAssignments] = useState<{
    [key: string]: string[];
  }>({});

  React.useEffect(() => {
    document.title = `Admin - ${vote.title}`;
  }, []);

  const [selectedOption, setSelectedOption] = useState("");

  React.useEffect(() => {
    const newAssignments = {};
    for (const choice of choices) {
      const selectedChoice = choice.selected[0];
      if (!newAssignments[selectedChoice]) {
        newAssignments[selectedChoice] = [];
      }
      newAssignments[selectedChoice].push(choice.id);
    }
    setAssignments(newAssignments);
  }, []);

  console.log(assignments);

  function deactivate() {
    if (prompt("Möchten Sie wirklich die Wahl beenden?") !== "Ja") return;
    updateDoc(doc(db, `/votes/${vote.id}`), {
      active: false,
    }).then(() => {
      window.location.reload();
    });
  }

  function activate() {
    if (!window.confirm("Möchten Sie wirklich die Wahl reaktivieren?")) return;
    updateDoc(doc(db, `/votes/${vote.id}`), {
      active: true,
    }).then(() => {
      window.location.reload();
    });
  }

  if (Object.keys(assignments).length < 1) {
    return <div>lade..</div>;
  }

  return (
    <div className="assign">
      <div className={`left ${selectedOption && "small"}`}>
        <div className="assignments">
          {options.map((option) => (
            <div
              onClick={() =>
                setSelectedOption(option.id === selectedOption ? "" : option.id)
              }
              key={option.id}
              className={`assignments-option ${
                assignments[option.id]?.length > option.max && "attention"
              } ${option.id === selectedOption && "selected"}`}
            >
              <div className="assignments-info">
                <div className="assignments-title">{option.title}</div>
                <div className="assignments-numbers">
                  {assignments[option.id]?.length || 0} / {option.max}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {selectedOption ? (
        <div className="right">
          <div className="assign-title">
            {options.find((option) => option.id === selectedOption)?.title}
          </div>

          <div className="assignments-choices">
            <table>
              <tbody>
                {assignments[selectedOption] &&
                  assignments[selectedOption].map((e) => (
                    <tr className="assignments-choice">
                      <td>{choices.find((choice) => choice.id === e)?.name}</td>
                      <td>
                        {choices.find((choice) => choice.id === e)?.grade}
                      </td>

                      {Array.from({ length: vote.selectCount }).map((_, i) => (
                        <td
                          className={`project-link ${
                            choices.find((choice) => choice.id === e)?.selected[
                              i
                            ] === selectedOption && "selected"
                          }`}
                        >
                          {
                            options.find(
                              (option) =>
                                choices.find((choice) => choice.id === e)
                                  ?.selected[i] === option.id
                            )?.title
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="info">
          <div className="assign-title">{vote.title}</div>
          <br />
          <p />
          <CSVFileUpload upload={(e) => console.log(e)} />

          <div className="actions">
            <div
              className="action"
              onClick={() => (vote.active ? deactivate() : activate())}
            >
              {vote.active ? "Beenden" : "Reaktivieren"}
            </div>
            <div className="action">Exportieren</div>
          </div>

          <div className="action">Vorzuteilen</div>
        </div>
      )}
    </div>
  );
}

export async function loader({ params }: { params: { id: string } }) {
  const vote = await getDoc(doc(db, `/votes/${params.id}`));
  if (!vote.exists()) {
    throw new Response("Document not found", {
      status: 404,
      statusText: "Document not found",
    });
  }
  const voteData = vote.data();

  if (!voteData.version || voteData.version < 2) {
    throw new Response("Please update the vote to the latest version", {
      status: 400,
      statusText: "Diese Wahl ist veraltet",
    });
  }

  const choices = await getDocs(collection(db, `/votes/${params.id}/choices`));
  const options = await getDocs(collection(db, `/votes/${params.id}/options`));

  return {
    vote: { id: vote.id, voteData },
    choices: choices.docs.map((e) => ({ id: e.id, ...e.data() })),
    options: options.docs.map((e) => ({ id: e.id, ...e.data() })),
  };
}

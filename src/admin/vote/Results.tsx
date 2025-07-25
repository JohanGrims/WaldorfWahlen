import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  DocumentData,
  Timestamp,
} from "firebase/firestore";
import {
  LoaderFunctionArgs,
  useLoaderData,
  useRevalidator,
} from "react-router-dom";
import { auth, db } from "../../firebase";

import { confirm, prompt, snackbar } from "mdui";
import React from "react";
import jsPDF from "jspdf";

interface VoteData extends DocumentData {
  id: string;
  title: string;
  result: boolean;
}

interface OptionData extends DocumentData {
  id: string;
  title: string;
  max: number;
}

interface ChoiceData extends DocumentData {
  id: string;
  name: string;
  grade: number;
  listIndex: number;
  selected: string[];
}

interface CommentData {
  from: string;
  text: string;
  timestamp: number;
}

interface ResultData extends DocumentData {
  id: string;
  result: string;
  comments?: CommentData[];
}

interface LoaderData {
  vote: VoteData;
  options: OptionData[];
  results: ResultData[];
  choices: ChoiceData[];
}

export default function Results() {
  const { vote, options, results, choices } = useLoaderData() as LoaderData;

  const [mode, setMode] = React.useState<"all" | "project" | "class">("all");

  const grades = [...new Set(choices.map((choice) => choice.grade))];

  const [commentText, setCommentText] = React.useState<string>("");
  const [commentGroup, setCommentGroup] = React.useState<string>("");
  const [commenting, setCommenting] = React.useState<boolean>(false);
  const [customMessage, setCustomMessage] = React.useState<string>("");
  const [showAttendanceDialog, setShowAttendanceDialog] =
    React.useState<boolean>(false);
  const [attendanceColumns, setAttendanceColumns] = React.useState<number>(5);
  const [emptyRows, setEmptyRows] = React.useState<number>(2);
  const [columnHeaders, setColumnHeaders] = React.useState<string[]>([
    "Anwesenheit 1",
    "Anwesenheit 2",
    "Anwesenheit 3",
    "Anwesenheit 4",
    "Anwesenheit 5",
  ]);

  const revalidator = useRevalidator();

  function printResults() {
    const printContents = document.querySelector(".print-table")?.outerHTML;

    if (!printContents) return;

    // Neues iframe erstellen
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "absolute";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "none";
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow || printFrame.contentDocument;
    if (!frameDoc) return;
    (frameDoc as any).document.open();
    (frameDoc as any).document.write(`
      <html>
        <head>
          <title>Drucken</title>
          <style>
            /* Optional: Stil-Definitionen für den Druck */
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);
    (frameDoc as any).document.close();

    // print()-Funktion des iframe verwenden
    (frameDoc as any).focus();
    (frameDoc as any).print();

    // iframe nach dem Drucken entfernen
    setTimeout(() => {
      document.body.removeChild(printFrame);
    }, 1000);
  }

  function printProjectResults(projectId: string) {
    const project = options.find((option) => option.id === projectId);
    if (!project) return;
    const projectResults = filteredResults().filter(
      (result) => result.result === projectId
    );

    // Add custom message if provided
    const messageContent = customMessage
      ? `<p><div style="background-color: #f5f5f5; padding: 15px; margin-bottom: 20px; border-left: 4px solid #2196F3; border-radius: 4px;"> ${customMessage
          .split("\n")
          .join("<br />")}</div></p>`
      : "";

    const printContents = `
      <div>
        <h2>${vote.title}</h2>
        <h3>${project.title.replace(/\[.*?\]/g, "")}</h3>
                ${messageContent}
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Klasse</th>
            </tr>
          </thead>
          <tbody>
            ${projectResults
              .map(
                (result) => `
              <tr>
                <td>${choices
                  .find((choice) => choice.id === result.id)
                  ?.name?.replace(/\[.*?\]/g, "")
                  .trim()}</td>
                <td>${
                  choices.find((choice) => choice.id === result.id)?.grade
                }</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        <p style="margin-top: 20px;">
          <i>Generiert am ${new Date().toLocaleDateString()} von ${
      auth.currentUser?.email
    } mit WaldorfWahlen</i>
        </p>
      </div>
    `;

    // Neues iframe erstellen
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "absolute";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "none";
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow || printFrame.contentDocument;
    if (!frameDoc) return;
    (frameDoc as any).document.open();
    (frameDoc as any).document.write(`
      <html>
        <head>
          <title>Drucken - ${project.title.replace(/\[.*?\]/g, "")}</title>
          <style>
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            h2, h3 { margin-bottom: 10px; }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);
    (frameDoc as any).document.close();

    // print()-Funktion des iframe verwenden
    (frameDoc as any).focus();
    (frameDoc as any).print();

    // iframe nach dem Drucken entfernen
    setTimeout(() => {
      document.body.removeChild(printFrame);
    }, 1000);
  }

  function printClassResults(grade: number) {
    const classResults = filteredResults().filter(
      (result) => result.grade == grade
    );

    // Add custom message if provided
    const messageContent = customMessage
      ? `<p><div style="background-color: #f5f5f5; padding: 15px; margin-bottom: 20px; border-left: 4px solid #2196F3; border-radius: 4px;"> ${customMessage
          .split("\n")
          .join("<br />")}</div></p>`
      : "";

    const printContents = `
      <div>
        <h2>${vote.title}</h2>
        <h3>Klasse ${grade}</h3>
        ${messageContent}
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Projekt</th>
            </tr>
          </thead>
          <tbody>
            ${classResults
              .map(
                (result) => `
              <tr>
                <td>${choices
                  .find((choice) => choice.id === result.id)
                  ?.name?.replace(/\[.*?\]/g, "")
                  .trim()}</td>
                <td>${
                  options.find((option) => option.id === result.result)?.title
                }</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        <p style="margin-top: 20px;">
          <i>Generiert am ${new Date().toLocaleDateString()} von ${
      auth.currentUser?.email
    } mit WaldorfWahlen</i>
        </p>
      </div>
    `;

    // Neues iframe erstellen
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "absolute";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "none";
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow || printFrame.contentDocument;
    if (!frameDoc) return;
    (frameDoc as any).document.open();
    (frameDoc as any).document.write(`
      <html>
        <head>
          <title>Drucken - Klasse ${grade}</title>
          <style>
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            h2, h3 { margin-bottom: 10px; }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);
    (frameDoc as any).document.close();

    // print()-Funktion des iframe verwenden
    (frameDoc as any).focus();
    (frameDoc as any).print();

    // iframe nach dem Drucken entfernen
    setTimeout(() => {
      document.body.removeChild(printFrame);
    }, 1000);
  }

  function publishResults() {
    confirm({
      icon: "warning",
      headline: "Ergebnisse veröffentlichen",
      description:
        "Sind Sie sicher, dass Sie die Ergebnisse veröffentlichen möchten? Dies kann nicht rückgängig gemacht werden.",
      confirmText: "Ja, veröffentlichen",
      cancelText: "Abbrechen",
      onConfirm: () => {
        setDoc(
          doc(db, `votes/${vote.id}`),
          {
            result: true,
          },
          { merge: true }
        ).then(() => {
          revalidator.revalidate();
          snackbar({
            message: "Ergebnisse veröffentlicht.",
          });
        });
      },
    });
  }

  const filteredResults = (): (ResultData & {
    name: string;
    grade: number;
    listIndex: number;
    comments?: CommentData[];
  })[] => {
    // sort by grade
    let resultsByGrade: Record<
      number,
      (ResultData & {
        name: string;
        grade: number;
        listIndex: number;
        comments?: CommentData[];
      })[]
    > = {};
    choices.forEach((choice) => {
      const result = results.find((res) => res.id === choice.id);
      if (!result) {
        return;
      }
      if (!resultsByGrade[choice.grade]) {
        resultsByGrade[choice.grade] = [];
      }
      resultsByGrade[choice.grade].push({
        ...result,
        name: choice.name,
        grade: choice.grade,
        listIndex: choice.listIndex,
      });
    });

    //  then sort by listIndex
    Object.keys(resultsByGrade).forEach((gradeKey) => {
      const grade = parseInt(gradeKey);
      resultsByGrade[grade].sort((a, b) => {
        return (
          choices.find((choice) => choice.id === a.id)!.listIndex -
          choices.find((choice) => choice.id === b.id)!.listIndex
        );
      });
    });

    // Convert resultsByGrade object to a list
    let resultsList: (ResultData & {
      name: string;
      grade: number;
      listIndex: number;
      comments?: CommentData[];
    })[] = [];
    Object.keys(resultsByGrade).forEach((gradeKey) => {
      const grade = parseInt(gradeKey);
      resultsByGrade[grade].forEach((result) => {
        resultsList.push({
          ...result,
          grade: grade,
        });
      });
    });

    return resultsList;
  };

  function addComment(id: string) {
    prompt({
      icon: "comment",
      headline: "Kommentar hinzufügen",
      description: "Geben Sie Ihren Kommentar ein:",
      textFieldOptions: {
        placeholder: "Ihr Kommentar",
        required: true,
        label: "Kommentar",
        maxlength: 1000,
        counter: true,
        rows: 3,
      },
      confirmText: "Hinzufügen",
      cancelText: "Abbrechen",
      onConfirm: (comment: string) => {
        const currentResult = results.find((result) => result.id === id);
        const existingComments = currentResult?.comments || [];
        setDoc(
          doc(db, `votes/${vote.id}/results/${id}`),
          {
            comments: [
              ...existingComments,
              {
                from: auth.currentUser?.email || "Unknown",
                text: comment,
                timestamp: Date.now(),
              },
            ],
          },
          {
            merge: true,
          }
        ).then(() => {
          revalidator.revalidate();
          snackbar({
            message: "Kommentar hinzugefügt.",
          });
        });
      },
    });
  }

  function deleteComment(id: string, index: number) {
    confirm({
      icon: "delete",
      headline: "Kommentar löschen",
      description: "Möchten Sie diesen Kommentar wirklich löschen?",
      confirmText: "Ja, löschen",
      cancelText: "Abbrechen",
      onConfirm: () => {
        const currentResult = results.find((result) => result.id === id);
        if (!currentResult || !currentResult.comments) return;
        const comments = [...currentResult.comments];
        comments.splice(index, 1);
        setDoc(
          doc(db, `votes/${vote.id}/results/${id}`),
          {
            comments: comments,
          },
          {
            merge: true,
          }
        ).then(() => {
          revalidator.revalidate();
          snackbar({
            message: "Kommentar gelöscht.",
          });
        });
      },
    });
  }

  function addCommentToGroup() {
    // Parse group
    let group: Record<string, string> = {};
    commentGroup.split(",").forEach((condition) => {
      const [key, value] = condition.split("=");
      if (key && value) {
        group[key.trim()] = value.trim();
      }
    });

    // Filter results
    let resultsToAdd: string[] = [];
    choices.forEach((choice) => {
      // Check if choice matches group, also considering the current results
      const currentResult = results.find((res) => res.id === choice.id);
      if (
        Object.keys(group).every((key) => {
          if (key === "name") {
            return choice.name.toLowerCase().includes(group[key].toLowerCase());
          } else if (key === "grade") {
            return choice.grade.toString() === group[key];
          } else if (key === "assignedTo") {
            // Check if the choice is assigned to the project with the ID group[key]
            return currentResult?.result === group[key];
          } else if (key === "choice") {
            // Check which index the assigned project has in the selected array (choices)
            return (
              currentResult?.result ===
              choice.selected[parseInt(group[key]) - 1]
            );
          }
          return false;
        })
      ) {
        resultsToAdd.push(choice.id);
      }
    });

    // Add comments
    resultsToAdd.forEach((id) => {
      const currentResult = results.find((res) => res.id === id);
      const existingComments = currentResult?.comments || [];
      setDoc(
        doc(db, `votes/${vote.id}/results/${id}`),
        {
          comments: [
            ...existingComments,
            {
              from: auth.currentUser?.email || "Unknown",
              text: commentText,
              timestamp: Date.now(),
            },
          ],
        },
        {
          merge: true,
        }
      );
    });
    revalidator.revalidate();
    snackbar({
      message: resultsToAdd.length + " Kommentare hinzugefügt.",
    });

    setCommenting(false);
  }

  function exportAttendancePDF() {
    setShowAttendanceDialog(true);
  }

  function generateAttendancePDF(
    attendanceColumns: number,
    emptyRows: number = 2,
    headers: string[] = []
  ) {
    const doc = new jsPDF("landscape", "mm", "a4");
    const pageWidth = 297; // A4 landscape width
    const pageHeight = 210; // A4 landscape height
    const margin = 15;
    const usableWidth = pageWidth - 2 * margin;

    // Calculate column widths
    const nameWidth = 80;
    const gradeWidth = 25;
    const checkboxWidth =
      (usableWidth - nameWidth - gradeWidth) / attendanceColumns;
    const checkboxSize = 2;
    const rowHeight = 6;

    let currentPage = 1;
    let currentY = margin;

    // Helper function to add custom message under project title
    function addCustomMessage() {
      if (customMessage) {
        doc.setFontSize(10);
        doc.setTextColor(70, 70, 70);

        // Split message into multiple lines if needed
        const maxWidth = usableWidth - 15;
        const lines = doc.splitTextToSize(customMessage, maxWidth);
        const messageHeight = Math.max(20, 10 + lines.length * 4);

        doc.setFillColor(245, 245, 245);
        doc.rect(margin, currentY, usableWidth, messageHeight, "F");
        doc.setDrawColor(33, 150, 243);
        doc.setLineWidth(0.5);
        doc.line(margin, currentY, margin, currentY + messageHeight);
        doc.line(margin + 2, currentY, margin + 2, currentY + messageHeight);
        doc.setTextColor(0, 0, 0);
        doc.text("Hinweis:", margin + 5, currentY + 6);

        lines.forEach((line: string, index: number) => {
          doc.text(line, margin + 5, currentY + 12 + index * 4);
        });

        currentY += messageHeight + 10;
      }
    }

    options.forEach((option, optionIndex) => {
      const projectStudents = filteredResults().filter(
        (result) => result.result === option.id
      );

      // Calculate needed height for this project (header + students + empty rows)
      const totalRows = projectStudents.length + emptyRows;

      // Always start a new page for each project (except the first one)
      if (optionIndex > 0) {
        doc.addPage();
        currentPage++;
        currentY = margin;
      }

      // Project title
      doc.setFontSize(12);
      doc.text(option.title.replace(/\[.*?\]/g, ""), margin, currentY + 8);
      currentY += 18;

      // Add custom message under project title
      addCustomMessage();

      // Table headers
      doc.setFontSize(10);
      const headerY = currentY;

      // Draw header background
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, headerY - 4, usableWidth, 6, "F");

      // Header texts
      doc.setTextColor(0, 0, 0);
      doc.text("Name", margin + 2, headerY);
      doc.text("Klasse", margin + nameWidth + 2, headerY);

      // Add column headers
      for (let col = 0; col < attendanceColumns; col++) {
        const headerText = headers[col];
        if (headerText && headerText.trim() !== "") {
          const headerX = margin + nameWidth + gradeWidth + col * checkboxWidth;
          doc.text(headerText, headerX + 2, headerY);
        }
      }

      currentY += 8;
      const dataStartY = currentY;

      // Process each row (students + empty rows)
      for (let rowIndex = 0; rowIndex < totalRows; rowIndex++) {
        // Check if this row fits on current page
        if (currentY + rowHeight > pageHeight - margin) {
          // Start new page with continuation header
          doc.addPage();
          currentPage++;
          currentY = margin;

          // Project title (continuation)
          doc.setFontSize(12);
          doc.text(
            option.title.replace(/\[.*?\]/g, "") + " (Fortsetzung)",
            margin,
            currentY + 8
          );
          currentY += 18;

          // Table headers
          doc.setFontSize(10);
          const newHeaderY = currentY;

          // Header background
          doc.setFillColor(240, 240, 240);
          doc.rect(margin, newHeaderY - 4, usableWidth, 6, "F");

          // Header texts
          doc.setTextColor(0, 0, 0);
          doc.text("Name", margin + 2, newHeaderY);
          doc.text("Klasse", margin + nameWidth + 2, newHeaderY);

          // Add column headers
          for (let col = 0; col < attendanceColumns; col++) {
            const headerText = headers[col];
            if (headerText && headerText.trim() !== "") {
              const headerX =
                margin + nameWidth + gradeWidth + col * checkboxWidth;
              doc.text(headerText, headerX + 2, newHeaderY);
            }
          }

          currentY += 8;
        }

        const rowY = currentY;

        // Draw row border lines
        doc.setDrawColor(200, 200, 200);

        // Vertical lines for this row
        doc.line(margin, rowY - 2, margin, rowY + rowHeight - 2); // Left
        doc.line(
          margin + nameWidth,
          rowY - 2,
          margin + nameWidth,
          rowY + rowHeight - 2
        );
        doc.line(
          margin + nameWidth + gradeWidth,
          rowY - 2,
          margin + nameWidth + gradeWidth,
          rowY + rowHeight - 2
        );

        for (let col = 1; col < attendanceColumns; col++) {
          const lineX = margin + nameWidth + gradeWidth + col * checkboxWidth;
          doc.line(lineX, rowY - 2, lineX, rowY + rowHeight - 2);
        }
        doc.line(
          margin + usableWidth,
          rowY - 2,
          margin + usableWidth,
          rowY + rowHeight - 2
        ); // Right

        // Top horizontal line for first row or after page break
        if (rowIndex === 0 || rowY === margin + 20) {
          doc.line(margin, rowY - 2, margin + usableWidth, rowY - 2);
        }

        // Bottom horizontal line for each row
        doc.line(
          margin,
          rowY + rowHeight - 2,
          margin + usableWidth,
          rowY + rowHeight - 2
        );

        // Add student data or leave empty
        if (rowIndex < projectStudents.length) {
          const student = choices.find(
            (choice) => choice.id === projectStudents[rowIndex].id
          );

          // Student name
          doc.text(
            student?.name?.replace(/\[.*?\]/g, "").trim() || "",
            margin + 2,
            rowY + 3
          );

          // Student grade
          doc.text(
            student?.grade?.toString() || "",
            margin + nameWidth + 2,
            rowY + 3
          );
        }

        // Draw attendance checkboxes (centered in columns)
        for (let col = 0; col < attendanceColumns; col++) {
          const checkboxX =
            margin +
            nameWidth +
            gradeWidth +
            col * checkboxWidth +
            (checkboxWidth - checkboxSize) / 2;
          const checkboxY = rowY; // Center checkboxes vertically to align with text
          doc.rect(checkboxX, checkboxY, checkboxSize, checkboxSize);
        }

        currentY += rowHeight;
      }

      // Add spacing after each project (no cutting line needed since each project starts on a new page)
      currentY += 10;
    });

    // Footer on each page
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Seite ${i} von ${totalPages} - Erstellt mit WaldorfWahlen`,
        pageWidth - margin - 50,
        pageHeight - 5
      );
    }

    // Save the PDF
    const fileName = `${vote.title.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}_Anwesenheit.pdf`;
    doc.save(fileName);

    snackbar({
      message: "PDF wurde erfolgreich erstellt und heruntergeladen.",
    });
  }

  function handleColumnCountChange(newCount: number) {
    setAttendanceColumns(newCount);
    const newHeaders = [...columnHeaders];

    // If we need more headers, add them
    while (newHeaders.length < newCount) {
      newHeaders.push(`Anwesenheit ${newHeaders.length + 1}`);
    }

    // If we have too many headers, remove the excess
    if (newHeaders.length > newCount) {
      newHeaders.splice(newCount);
    }

    setColumnHeaders(newHeaders);
  }

  function handleHeaderChange(index: number, value: string) {
    const newHeaders = [...columnHeaders];
    newHeaders[index] = value;
    setColumnHeaders(newHeaders);
  }

  return (
    <div className="mdui-prose">
      <mdui-dialog fullscreen open={commenting}>
        <mdui-button-icon
          icon="close"
          onClick={() => setCommenting(false)}
        ></mdui-button-icon>
        <mdui-text-field
          label="Kommentar"
          rows={5}
          value={commentText}
          onInput={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setCommentText(e.target.value)
          }
          placeholder="Ihr Kommentar"
        />
        <p />
        <div>
          <mdui-collapse>
            <mdui-collapse-item value="info">
              <mdui-list-item rounded slot="header" icon="info">
                Informationen
                <mdui-icon
                  slot="end-icon"
                  name="keyboard_arrow_down"
                ></mdui-icon>
              </mdui-list-item>
              <div className="mdui-prose">
                Durchsuchen Sie die Ergebnisse mit folgenden Operatoren:
                <ul>
                  <li>
                    <code>name=Johan</code>: Schüler deren Name Johan enthält
                  </li>
                  <li>
                    <code>grade=12</code>: Schüler der 12. Klasse
                  </li>
                  <li>
                    <code>assignedTo=abc</code>: Schüler die zu dem Projekt mit
                    der ID abc zugewiesen sind
                  </li>
                  <li>
                    <code>choice=2</code>: Schüler die zu ihrer Zweitwahl
                    zugewiesen sind
                  </li>
                </ul>
              </div>
            </mdui-collapse-item>
            <mdui-collapse-item value="results">
              <mdui-list-item rounded slot="header" icon="preview">
                Projekte anzeigen
                <mdui-icon
                  slot="end-icon"
                  name="keyboard_arrow_down"
                ></mdui-icon>
              </mdui-list-item>
              <div className="mdui-table">
                <table>
                  <thead>
                    <tr>
                      <th>
                        <b>Projekt</b>
                      </th>
                      <th>
                        <b>Maximalanzahl</b>
                      </th>
                      <th>
                        <b>ID</b>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {options.map((option, i) => (
                      <tr key={i}>
                        <td>{option.title}</td>
                        <td>{option.max}</td>
                        <td>{option.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </mdui-collapse-item>
          </mdui-collapse>
        </div>
        <p />
        <mdui-text-field
          label="Gruppe"
          value={commentGroup}
          onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
            setCommentGroup(e.target.value)
          }
          placeholder="grade=12"
        />
        <p />
        <mdui-button onClick={() => addCommentToGroup()} icon="add">
          Hinzufügen
        </mdui-button>
      </mdui-dialog>

      <mdui-dialog fullscreen open={showAttendanceDialog}>
        <mdui-button-icon
          icon="close"
          onClick={() => setShowAttendanceDialog(false)}
        ></mdui-button-icon>
        <div className="mdui-prose" style={{ padding: "20px" }}>
          <h2>Anwesenheitsliste konfigurieren</h2>

          <div style={{ marginBottom: "20px" }}>
            <mdui-text-field
              label="Anzahl Spalten"
              type="number"
              value={attendanceColumns.toString()}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleColumnCountChange(parseInt(e.target.value) || 1)
              }
              min={1}
              max={10}
              style={{ width: "200px", marginRight: "20px" }}
            />
            <mdui-text-field
              label="Leere Zeilen nach Projekt"
              type="number"
              value={emptyRows.toString()}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEmptyRows(parseInt(e.target.value) || 0)
              }
              min={0}
              max={10}
              style={{ width: "200px" }}
            />
          </div>

          <h3>Spaltenüberschriften</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "15px",
              marginBottom: "30px",
            }}
          >
            {columnHeaders.slice(0, attendanceColumns).map((header, index) => (
              <mdui-text-field
                key={index}
                label={`Spalte ${index + 1}`}
                value={header}
                onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleHeaderChange(index, e.target.value)
                }
                style={{ width: "100%" }}
              />
            ))}
          </div>

          <div
            style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}
          >
            <mdui-button
              variant="outlined"
              onClick={() => setShowAttendanceDialog(false)}
            >
              Abbrechen
            </mdui-button>
            <mdui-button
              onClick={() => {
                generateAttendancePDF(
                  attendanceColumns,
                  emptyRows,
                  columnHeaders
                );
                setShowAttendanceDialog(false);
              }}
              icon="picture_as_pdf"
            >
              PDF erstellen
            </mdui-button>
          </div>
        </div>
      </mdui-dialog>

      <h2>Ergebnisse</h2>
      <mdui-card
        variant="outlined"
        style={{ width: "100%", padding: "20px" }}
        clickable
        disabled={vote.result || !results.length}
        onClick={() => {
          if (!vote.result && results.length) {
            publishResults();
          }
        }}
      >
        <div
          className="mdui-prose"
          style={{ width: "100%", userSelect: "none" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div style={{ gap: "10px", textWrap: "nowrap", display: "flex" }}>
              <h2>Ergebnisse veröffentlichen</h2>
              <mdui-icon name="upload"></mdui-icon>
            </div>
            {vote.result && <div>Bereits veröffentlicht</div>}
          </div>
          Bei der Veröffentlichung werden keine persönlichen Daten
          veröffentlicht. Deshalb ist das Ansehen nur auf dem selben Gerät
          möglich, auf dem die Antwort abgegeben wurde.
        </div>
      </mdui-card>
      <mdui-card
        variant="outlined"
        clickable
        onClick={printResults}
        style={{ width: "100%", padding: "20px" }}
      >
        <div
          className="mdui-prose"
          style={{ width: "100%", userSelect: "none" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div style={{ gap: "10px", textWrap: "nowrap", display: "flex" }}>
              <h2 style={{ marginBottom: 0 }}>
                {mode === "all"
                  ? "Alle Ergebnisse"
                  : mode === "project"
                  ? "Nach Projekt"
                  : "Nach Klasse"}{" "}
                drucken
              </h2>
              <mdui-icon name="print"></mdui-icon>
            </div>
          </div>
        </div>
      </mdui-card>
      <br />
      <p />
      <mdui-divider />
      <p />

      <div style={{ marginBottom: "20px" }}>
        <mdui-text-field
          label="Benutzerdefinierte Nachricht (optional)"
          value={customMessage}
          onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
            setCustomMessage(e.target.value)
          }
          placeholder="Diese Nachricht wird oben auf allen gedruckten Dokumenten angezeigt..."
          style={{ width: "100%" }}
          rows={3}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <mdui-radio-group value={mode}>
          <mdui-radio value="all" onClick={() => setMode("all")}>
            Alle
          </mdui-radio>
          <mdui-radio value="project" onClick={() => setMode("project")}>
            Nach Projekt
          </mdui-radio>
          <mdui-radio value="class" onClick={() => setMode("class")}>
            Nach Klasse
          </mdui-radio>
        </mdui-radio-group>

        <div style={{ display: "flex", gap: "10px" }}>
          <mdui-button
            onClick={() => {
              setCommenting(true);
            }}
            icon="comment"
          >
            Kommentare hinzufügen
          </mdui-button>

          <mdui-button
            onClick={exportAttendancePDF}
            icon="picture_as_pdf"
            variant="outlined"
          >
            Anwesenheitsliste
          </mdui-button>
        </div>
      </div>

      {mode === "all" && (
        <>
          <div className="mdui-table" style={{ width: "100%" }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Klasse</th>
                  <th>#</th>
                  <th>Projekt</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults().map((result) => (
                  <tr key={result.id}>
                    <td>
                      {choices
                        .find((choice) => choice.id === result.id)
                        ?.name?.replace(/\[.*?\]/g, "")
                        .trim()}
                    </td>
                    <td>
                      {choices.find((choice) => choice.id === result.id)?.grade}
                    </td>
                    <td>
                      {
                        choices.find((choice) => choice.id === result.id)
                          ?.listIndex
                      }
                    </td>
                    <td
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "10px",
                      }}
                    >
                      {options
                        .find((option) => option.id === result.result)
                        ?.title?.replace(/\[.*?\]/g, "")}

                      {result.comments !== undefined &&
                      result.comments.length < 1 ? (
                        <mdui-button-icon
                          icon="comment"
                          onClick={() => addComment(result.id)}
                        ></mdui-button-icon>
                      ) : (
                        <mdui-dropdown placement="left">
                          <mdui-button-icon slot="trigger" icon="comment">
                            <mdui-badge>
                              {result.comments?.length || 0}
                            </mdui-badge>
                          </mdui-button-icon>
                          <mdui-menu>
                            <mdui-list>
                              {result.comments?.map((comment, index) => (
                                <mdui-list-item
                                  style={{
                                    maxWidth: "500px",
                                  }}
                                  key={index}
                                >
                                  <div
                                    style={{
                                      whiteSpace: "normal",
                                      height: "auto",
                                    }}
                                  >
                                    {comment.text}
                                    <br />
                                    <i
                                      style={{
                                        color: "gray",
                                        fontSize: "12px",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                      }}
                                    >
                                      {comment.from}{" "}
                                      <mdui-button-icon
                                        onClick={() => {
                                          deleteComment(result.id, index);
                                        }}
                                        icon="delete"
                                      ></mdui-button-icon>
                                    </i>
                                  </div>
                                </mdui-list-item>
                              ))}
                              <mdui-list-item
                                rounded
                                onClick={() => addComment(result.id)}
                                icon="comment"
                              >
                                <div>Kommentar hinzufügen</div>
                              </mdui-list-item>
                            </mdui-list>
                          </mdui-menu>
                        </mdui-dropdown>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>{" "}
          <div className="print-table">
            <h2>{vote.title}</h2>
            {customMessage && (
              <p>
                <div
                  style={{
                    backgroundColor: "#f5f5f5",
                    padding: "15px",
                    marginBottom: "20px",
                    borderLeft: "4px solid #2196F3",
                    borderRadius: "4px",
                  }}
                >
                  {customMessage.split("\n").map((line) => (
                    <span key={line}>
                      {line}
                      <br />
                    </span>
                  ))}
                </div>
              </p>
            )}

            <table>
              <thead>
                <tr>
                  <th>Klasse</th>
                  <th>Name</th>
                  <th>Projekt</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults().map((result) => (
                  <tr key={result.id}>
                    <td>
                      {choices.find((choice) => choice.id === result.id)?.grade}
                    </td>
                    <td>
                      {choices
                        .find((choice) => choice.id === result.id)
                        ?.name?.replace(/\[.*?\]/g, "")
                        .trim()}
                    </td>
                    <td>
                      {options
                        .find((option) => option.id === result.result)
                        ?.title?.replace(/\[.*?\]/g, "")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>
                    <i>
                      Generiert am {new Date().toLocaleDateString()} von{" "}
                      {auth.currentUser?.email} mit WaldorfWahlen
                    </i>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {mode === "project" && (
        <>
          <mdui-tabs
            style={{ width: "100%", overflowX: "auto" }}
            value={options[0].id}
          >
            {options.map((option) => (
              <mdui-tab
                style={{ whiteSpace: "nowrap" }}
                key={option.id}
                value={option.id}
              >
                {option.title.replace(/\[.*?\]/g, "")}
              </mdui-tab>
            ))}
            {options.map((option) => (
              <mdui-tab-panel
                key={option.id}
                id={option.id}
                slot="panel"
                value={option.id}
              >
                <>
                  <p />
                  <div style={{ padding: "10px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "15px",
                      }}
                    >
                      <h3 style={{ margin: 0 }}>
                        {option.title.replace(/\[.*?\]/g, "")}
                      </h3>
                      <mdui-button
                        icon="print"
                        variant="outlined"
                        onClick={() => printProjectResults(option.id)}
                      >
                        Drucken
                      </mdui-button>
                    </div>
                    <div className="mdui-table" style={{ width: "100%" }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Klasse</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredResults()
                            .filter((result) => result.result === option.id)
                            .map((result) => (
                              <tr key={result.id}>
                                <td>
                                  {choices
                                    .find((choice) => choice.id === result.id)
                                    ?.name?.replace(/\[.*?\]/g, "")
                                    .trim()}
                                </td>
                                <td>
                                  {
                                    choices.find(
                                      (choice) => choice.id === result.id
                                    )?.grade
                                  }
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              </mdui-tab-panel>
            ))}
          </mdui-tabs>
          <div className="print-table">
            <h2>{vote.title}</h2>
            {customMessage && (
              <div
                style={{
                  backgroundColor: "#f5f5f5",
                  padding: "15px",
                  marginBottom: "20px",
                  borderLeft: "4px solid #2196F3",
                  borderRadius: "4px",
                }}
              >
                {customMessage.split("\n").map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
              </div>
            )}

            {options.map((option) => (
              <div key={option.id}>
                <h3>{option.title.replace(/\[.*?\]/g, "")}</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Klasse</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults()
                      .filter((result) => result.result === option.id)
                      .map((result) => (
                        <tr key={result.id}>
                          <td>
                            {choices
                              .find((choice) => choice.id === result.id)
                              ?.name?.replace(/\[.*?\]/g, "")
                              .trim()}
                          </td>
                          <td
                            style={{
                              width: "50px",
                            }}
                          >
                            {
                              choices.find((choice) => choice.id === result.id)
                                ?.grade
                            }
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ))}
            <tfoot>
              <p>
                Generiert am {new Date().toLocaleDateString()} von{" "}
                {auth.currentUser?.email} mit WaldorfWahlen
              </p>
            </tfoot>
          </div>
        </>
      )}

      {mode === "class" && (
        <>
          <mdui-tabs
            style={{ width: "100%", overflowX: "auto" }}
            value={String(
              grades.sort(
                (a, b) => parseInt(a.toString()) - parseInt(b.toString())
              )[0]
            )}
          >
            {grades
              .sort((a, b) => parseInt(a.toString()) - parseInt(b.toString()))
              .map((grade) => (
                <mdui-tab
                  style={{ whiteSpace: "nowrap" }}
                  key={grade}
                  value={grade.toString()}
                >
                  Klasse {grade}
                </mdui-tab>
              ))}
            {grades
              .sort((a, b) => parseInt(a.toString()) - parseInt(b.toString()))
              .map((grade) => (
                <mdui-tab-panel
                  key={grade}
                  id={grade.toString()}
                  slot="panel"
                  value={grade.toString()}
                >
                  <>
                    <p />
                    <div style={{ padding: "10px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "15px",
                        }}
                      >
                        <h3 style={{ margin: 0 }}>Klasse {grade}</h3>
                        <mdui-button
                          icon="print"
                          variant="outlined"
                          onClick={() => printClassResults(grade)}
                        >
                          Drucken
                        </mdui-button>
                      </div>
                      <div className="mdui-table" style={{ width: "100%" }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Projekt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredResults()
                              .filter((result) => result.grade == grade)
                              .map((result) => (
                                <tr key={result.id}>
                                  <td>
                                    {choices
                                      .find((choice) => choice.id === result.id)
                                      ?.name?.replace(/\[.*?\]/g, "")
                                      .trim()}
                                  </td>
                                  <td>
                                    {
                                      options.find(
                                        (option) => option.id === result.result
                                      )?.title
                                    }
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                </mdui-tab-panel>
              ))}
          </mdui-tabs>

          <div className="print-table">
            <h2>{vote.title}</h2>

            {customMessage && (
              <div
                style={{
                  backgroundColor: "#f5f5f5",
                  padding: "15px",
                  marginBottom: "20px",
                  borderLeft: "4px solid #2196F3",
                  borderRadius: "4px",
                }}
              >
                {customMessage.split("\n").map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
              </div>
            )}
            {grades.map((grade) => (
              <div key={grade}>
                <h3>Klasse {grade}</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Projekt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults()
                      .filter((result) => Number(result.grade) == Number(grade))
                      .map((result) => (
                        <tr key={result.id}>
                          <td style={{ width: "50%" }}>
                            {choices
                              .find((choice) => choice.id === result.id)
                              ?.name?.replace(/\[.*?\]/g, "")}
                          </td>
                          <td>
                            {
                              options.find(
                                (option) => option.id === result.result
                              )?.title
                            }
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <br />
              </div>
            ))}
            <tfoot>
              <p>
                Generiert am {new Date().toLocaleDateString()} von{" "}
                {auth.currentUser?.email} mit WaldorfWahlen
              </p>
            </tfoot>
          </div>
        </>
      )}
    </div>
  );
}

Results.loader = async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params as { id: string };
  const vote = await getDoc(doc(db, `/votes/${id}`));
  const voteData = { id, ...vote.data() } as VoteData;
  const options = (
    await getDocs(collection(db, `/votes/${id}/options`))
  ).docs.map((doc) => {
    return { id: doc.id, ...doc.data() };
  }) as OptionData[];

  const results = (
    await getDocs(collection(db, `/votes/${id}/results`))
  ).docs.map((doc) => {
    return { id: doc.id, ...doc.data() };
  }) as ResultData[];

  const choices = (
    await getDocs(collection(db, `/votes/${id}/choices`))
  ).docs.map((doc) => {
    return { id: doc.id, ...doc.data() };
  }) as ChoiceData[];

  return {
    vote: voteData,
    options,
    results,
    choices,
  };
};

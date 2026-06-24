import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  DocumentData,
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
  const [commenting, setCommenting] = React.useState<boolean>(false);

  // Visual comment filter state
  const [commentNameSearch, setCommentNameSearch] = React.useState<string>("");
  const [commentGrade, setCommentGrade] = React.useState<string>("all");
  const [commentAssignedTo, setCommentAssignedTo] = React.useState<string>("all");
  const [customMessage, setCustomMessage] = React.useState<string>("");
  const [showAttendanceDialog, setShowAttendanceDialog] =
    React.useState<boolean>(false);
  const [emptyRows, setEmptyRows] = React.useState<number>(2);
  // columnHeaders is the single source of truth; its length = number of columns
  const [columnHeaders, setColumnHeaders] = React.useState<string[]>([
    "Anwesenheit 1",
    "Anwesenheit 2",
    "Anwesenheit 3",
    "Anwesenheit 4",
    "Anwesenheit 5",
  ]);

  // Date generator state
  const [dateGenMode, setDateGenMode] = React.useState<"weekday" | "consecutive">("weekday");
  const today = new Date().toISOString().split("T")[0];
  const [dateGenStartDate, setDateGenStartDate] = React.useState<string>(today);
  const [dateGenEndDate, setDateGenEndDate] = React.useState<string>("");
  const [dateGenWeekday, setDateGenWeekday] = React.useState<number>(2); // 0=Sun…6=Sat, default=Tuesday
  const [dateGenFormat, setDateGenFormat] = React.useState<"short" | "medium" | "weekday">("short");

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
          doc(db, `schools/SCHOOLID/votes/${vote.id}`),
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
          doc(db, `schools/SCHOOLID/votes/${vote.id}/results/${id}`),
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
          doc(db, `schools/SCHOOLID/votes/${vote.id}/results/${id}`),
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

  const commentFilteredChoices = React.useMemo(() => {
    return choices.filter((choice) => {
      if (commentNameSearch.trim() && !choice.name.toLowerCase().includes(commentNameSearch.toLowerCase())) return false;
      if (commentGrade !== "all" && choice.grade.toString() !== commentGrade) return false;
      if (commentAssignedTo !== "all") {
        const result = results.find((r) => r.id === choice.id);
        if (!result || result.result !== commentAssignedTo) return false;
      }
      return true;
    });
  }, [choices, results, commentNameSearch, commentGrade, commentAssignedTo]);

  function addCommentToGroup() {
    const idsToComment = commentFilteredChoices.map((c) => c.id);

    idsToComment.forEach((id) => {
      const currentResult = results.find((res) => res.id === id);
      const existingComments = currentResult?.comments || [];
      setDoc(
        doc(db, `schools/SCHOOLID/votes/${vote.id}/results/${id}`),
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
        { merge: true }
      );
    });
    revalidator.revalidate();
    snackbar({ message: idsToComment.length + " Kommentare hinzugefügt." });
    setCommenting(false);
    setCommentText("");
    setCommentNameSearch("");
    setCommentGrade("all");
    setCommentAssignedTo("all");
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

    // Narrower fixed columns to free space for attendance checkboxes
    const nameWidth = 55;
    const gradeWidth = 15;
    const checkboxWidth =
      (usableWidth - nameWidth - gradeWidth) / attendanceColumns;
    const checkboxSize = 2.5;
    const rowHeight = 6;

    // Use vertical header text when columns are narrow
    const verticalHeaders = checkboxWidth < 14;
    const headerRowHeight = verticalHeaders ? 16 : 8; // mm of space for the header row

    let currentPage = 1;
    let currentY = margin;

    // Helper to draw header row at a given Y
    function drawHeaderRow(y: number) {
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y - 4, usableWidth, verticalHeaders ? headerRowHeight : 6, "F");

      doc.setFontSize(verticalHeaders ? 7 : 10);
      doc.setTextColor(0, 0, 0);
      
      // Bottom align "Name" and "Kl."
      const textY = verticalHeaders ? y + headerRowHeight - 6 : y;
      doc.text("Name", margin + 2, textY);
      doc.text("Kl.", margin + nameWidth + 2, textY);

      for (let col = 0; col < attendanceColumns; col++) {
        const headerText = headers[col];
        if (headerText && headerText.trim() !== "") {
          const colX = margin + nameWidth + gradeWidth + col * checkboxWidth;
          if (verticalHeaders) {
            // Rotate text 90° — anchor at bottom-center of the column
            doc.setFontSize(7);
            doc.text(
              headerText,
              colX + checkboxWidth / 2 + 1,
              y + headerRowHeight - 6,
              { angle: 90 }
            );
          } else {
            doc.setFontSize(8);
            doc.text(headerText, colX + 1, y, { maxWidth: checkboxWidth - 1 });
          }
        }
      }
    }

    // Helper function to add custom message under project title
    function addCustomMessage() {
      if (customMessage) {
        doc.setFontSize(10);
        doc.setTextColor(70, 70, 70);

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

      const totalRows = projectStudents.length + emptyRows;

      if (optionIndex > 0) {
        doc.addPage();
        currentPage++;
        currentY = margin;
      }

      // Project title
      doc.setFontSize(12);
      doc.text(option.title.replace(/\[.*?\]/g, ""), margin, currentY + 8);
      currentY += 18;

      addCustomMessage();

      // Table header
      doc.setFontSize(10);
      const headerY = currentY;
      drawHeaderRow(headerY);
      currentY += headerRowHeight + (verticalHeaders ? 2 : 0);

      // Process each row
      for (let rowIndex = 0; rowIndex < totalRows; rowIndex++) {
        if (currentY + rowHeight > pageHeight - margin) {
          doc.addPage();
          currentPage++;
          currentY = margin;

          doc.setFontSize(12);
          doc.text(
            option.title.replace(/\[.*?\]/g, "") + " (Fortsetzung)",
            margin,
            currentY + 8
          );
          currentY += 18;

          drawHeaderRow(currentY);
          currentY += headerRowHeight + (verticalHeaders ? 2 : 0);
        }

        const rowY = currentY;

        doc.setDrawColor(200, 200, 200);

        // Vertical dividers
        doc.line(margin, rowY - 2, margin, rowY + rowHeight - 2);
        doc.line(margin + nameWidth, rowY - 2, margin + nameWidth, rowY + rowHeight - 2);
        doc.line(margin + nameWidth + gradeWidth, rowY - 2, margin + nameWidth + gradeWidth, rowY + rowHeight - 2);

        for (let col = 1; col < attendanceColumns; col++) {
          const lineX = margin + nameWidth + gradeWidth + col * checkboxWidth;
          doc.line(lineX, rowY - 2, lineX, rowY + rowHeight - 2);
        }
        doc.line(margin + usableWidth, rowY - 2, margin + usableWidth, rowY + rowHeight - 2);

        if (rowIndex === 0) {
          doc.line(margin, rowY - 2, margin + usableWidth, rowY - 2);
        }
        doc.line(margin, rowY + rowHeight - 2, margin + usableWidth, rowY + rowHeight - 2);

        if (rowIndex < projectStudents.length) {
          const student = choices.find(
            (choice) => choice.id === projectStudents[rowIndex].id
          );

          doc.setFontSize(8);
          doc.setTextColor(0, 0, 0);

          // Truncate name to fit column
          const rawName = student?.name?.replace(/\[.*?\]/g, "").trim() || "";
          const nameStr = doc.splitTextToSize(rawName, nameWidth - 3)[0] || rawName;
          doc.text(nameStr, margin + 2, rowY + 3);

          doc.text(
            student?.grade?.toString() || "",
            margin + nameWidth + 2,
            rowY + 3
          );
        }

        // Checkboxes
        for (let col = 0; col < attendanceColumns; col++) {
          const checkboxX =
            margin +
            nameWidth +
            gradeWidth +
            col * checkboxWidth +
            (checkboxWidth - checkboxSize) / 2;
          const checkboxY = rowY + (rowHeight - checkboxSize) / 2 - 2;
          doc.rect(checkboxX, checkboxY, checkboxSize, checkboxSize);
        }

        currentY += rowHeight;
      }

      currentY += 10;
    });

    // Footer
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

  function handleHeaderChange(index: number, value: string) {
    const next = [...columnHeaders];
    next[index] = value;
    setColumnHeaders(next);
  }

  function deleteHeader(index: number) {
    setColumnHeaders(columnHeaders.filter((_, i) => i !== index));
  }

  function insertHeaderAfter(index: number) {
    const next = [...columnHeaders];
    next.splice(index + 1, 0, "");
    setColumnHeaders(next);
  }

  function addHeader() {
    setColumnHeaders([...columnHeaders, ""]);
  }

  /** Format a Date according to the chosen dateGenFormat. */
  function formatDate(d: Date): string {
    const weekdayNames = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    if (dateGenFormat === "short") return `${day}.${month}.`;
    if (dateGenFormat === "medium") return `${day}.${month}.${d.getFullYear()}`;
    return `${weekdayNames[d.getDay()]} ${day}.${month}.`;
  }

  /** Build date list from start→end (or unbounded) range. */
  function buildDateList(): string[] {
    const start = new Date(dateGenStartDate);
    if (isNaN(start.getTime())) return [];
    const end = dateGenEndDate ? new Date(dateGenEndDate) : null;
    const dates: string[] = [];
    const cursor = new Date(start);

    if (dateGenMode === "weekday") {
      // advance to first occurrence of the chosen weekday
      while (cursor.getDay() !== dateGenWeekday) cursor.setDate(cursor.getDate() + 1);
      while (!end || cursor <= end) {
        dates.push(formatDate(new Date(cursor)));
        cursor.setDate(cursor.getDate() + 7);
        if (!end && dates.length >= 52) break; // safety cap when no end date
      }
    } else {
      while (!end || cursor <= end) {
        const dow = cursor.getDay();
        if (dow !== 0 && dow !== 6) dates.push(formatDate(new Date(cursor)));
        cursor.setDate(cursor.getDate() + 1);
        if (!end && dates.length >= 52) break;
      }
    }
    return dates;
  }

  /** Apply generated dates to columnHeaders. */
  function generateDates() {
    const list = buildDateList();
    if (list.length > 0) setColumnHeaders(list);
  }

  return (
    <div className="mdui-prose">
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
      <mdui-dialog fullscreen open={commenting}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h2 style={{ margin: 0 }}>Kommentare hinzufügen</h2>
          <mdui-button-icon icon="close" onClick={() => setCommenting(false)}></mdui-button-icon>
        </div>

        {/* Comment text */}
        <mdui-text-field
          label="Kommentar"
          rows={4}
          value={commentText}
          onInput={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCommentText(e.target.value)}
          placeholder="Nachricht an die Schüler..."
          style={{ width: "100%", marginBottom: "20px" }}
        />

        {/* Visual filter: who gets this comment? */}
        <h3 style={{ margin: "0 0 12px 0" }}>Empfänger</h3>

        {/* Name search */}
        <mdui-text-field
          icon="search"
          placeholder="Name suchen..."
          value={commentNameSearch}
          onInput={(e: any) => setCommentNameSearch(e.target.value)}
          clearable
          style={{ width: "100%", marginBottom: "12px" }}
        ></mdui-text-field>

        {/* Grade tabs */}
        <mdui-tabs value={commentGrade} style={{ marginBottom: "12px" }}>
          <mdui-tab value="all" onClick={() => setCommentGrade("all")}>Alle Klassen</mdui-tab>
          {grades.map((g) => (
            <mdui-tab key={g} value={String(g)} onClick={() => setCommentGrade(String(g))}>Klasse {g}</mdui-tab>
          ))}
        </mdui-tabs>

        {/* Project assignment filter */}
        <mdui-select
          label="Zugewiesenes Projekt"
          value={commentAssignedTo}
          onChange={(e: any) => setCommentAssignedTo(e.target.value)}
          style={{ width: "100%", marginBottom: "16px" }}
        >
          <mdui-menu-item value="all">Alle Projekte</mdui-menu-item>
          {options.map((opt) => (
            <mdui-menu-item key={opt.id} value={opt.id}>{opt.title}</mdui-menu-item>
          ))}
        </mdui-select>

        {/* Live preview */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <span style={{ color: "gray", fontSize: "14px" }}>
            {commentFilteredChoices.length} Schüler {commentFilteredChoices.length === 1 ? "erhält" : "erhalten"} diesen Kommentar
          </span>
        </div>
        <div style={{padding: "10px"}}>
        <div className="mdui-table" style={{ width: "100%", maxHeight: "280px", overflowY: "auto", marginBottom: "20px" }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Klasse</th>
                <th>Projekt</th>
              </tr>
            </thead>
            <tbody>
              {commentFilteredChoices.map((choice) => {
                const result = results.find((r) => r.id === choice.id);
                const project = options.find((o) => o.id === result?.result);
                return (
                  <tr key={choice.id}>
                    <td>{choice.name.replace(/\[.*?\]/g, "").trim()}</td>
                    <td>{choice.grade}</td>
                    <td>{project?.title || "—"}</td>
                  </tr>
                );
              })}
              {commentFilteredChoices.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: "center", padding: "20px", color: "gray" }}>Keine Schüler gefunden.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        </div>

        <mdui-button
          onClick={() => addCommentToGroup()}
          icon="add"
          disabled={!commentText.trim() || commentFilteredChoices.length === 0}
        >
          Kommentar hinzufügen ({commentFilteredChoices.length})
        </mdui-button>
      </mdui-dialog>

      <mdui-dialog fullscreen open={showAttendanceDialog}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
        }}>
          {/* ── Header bar ── */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "16px 20px",
            borderBottom: "1px solid var(--mdui-color-outline-variant, #e0e0e0)",
            flexShrink: 0,
          }}>
            <mdui-button-icon icon="close" onClick={() => setShowAttendanceDialog(false)} />
            <span style={{ fontSize: "20px", fontWeight: 600, flex: 1 }}>Anwesenheitsliste konfigurieren</span>
            <mdui-button
              onClick={() => {
                generateAttendancePDF(columnHeaders.length, emptyRows, columnHeaders);
                setShowAttendanceDialog(false);
              }}
              icon="picture_as_pdf"
            >
              PDF erstellen
            </mdui-button>
          </div>

          {/* ── Scrollable body ── */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: "28px" }}>

            {/* Section 1 — Allgemein */}
            <section>
              <p style={{ margin: "0 0 14px 0", fontWeight: 600, fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--mdui-color-outline, #888)" }}>Allgemein</p>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <mdui-text-field
                  label="Leere Zeilen nach Projekt"
                  type="number"
                  value={emptyRows.toString()}
                  onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEmptyRows(parseInt(e.target.value) || 0)
                  }
                  min={0}
                  max={10}
                  style={{ width: "220px" }}
                />
              </div>
            </section>

            {/* Section 2 — Datumsgenerator */}
            <section>
              <p style={{ margin: "0 0 14px 0", fontWeight: 600, fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--mdui-color-outline, #888)" }}>Datumsgenerator</p>
              <div style={{
                border: "1px solid var(--mdui-color-outline-variant, #e0e0e0)",
                borderRadius: "12px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "18px",
              }}>
                {/* Mode row */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <mdui-chip
                    selectable
                    selected={dateGenMode === "weekday"}
                    onClick={() => setDateGenMode("weekday")}
                  >
                    Jede Woche
                  </mdui-chip>
                  <mdui-chip
                    selectable
                    selected={dateGenMode === "consecutive"}
                    onClick={() => setDateGenMode("consecutive")}
                  >
                    Aufeinanderfolgend
                  </mdui-chip>
                </div>

                {/* Inputs row */}
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
                  <mdui-text-field
                    label="Von"
                    type="date"
                    value={dateGenStartDate}
                    onInput={(e: React.ChangeEvent<HTMLInputElement>) => setDateGenStartDate(e.target.value)}
                    style={{ width: "160px" }}
                  />
                  <mdui-text-field
                    label="Bis (optional)"
                    type="date"
                    value={dateGenEndDate}
                    onInput={(e: React.ChangeEvent<HTMLInputElement>) => setDateGenEndDate(e.target.value)}
                    style={{ width: "160px" }}
                  />
                  {dateGenMode === "weekday" && (
                    <mdui-select
                      label="Wochentag"
                      value={String(dateGenWeekday)}
                      onChange={(e: any) => setDateGenWeekday(Number(e.target.value))}
                      style={{ width: "150px" }}
                    >
                      <mdui-menu-item value="1">Montag</mdui-menu-item>
                      <mdui-menu-item value="2">Dienstag</mdui-menu-item>
                      <mdui-menu-item value="3">Mittwoch</mdui-menu-item>
                      <mdui-menu-item value="4">Donnerstag</mdui-menu-item>
                      <mdui-menu-item value="5">Freitag</mdui-menu-item>
                      <mdui-menu-item value="6">Samstag</mdui-menu-item>
                      <mdui-menu-item value="0">Sonntag</mdui-menu-item>
                    </mdui-select>
                  )}
                  <mdui-select
                    label="Format"
                    value={dateGenFormat}
                    onChange={(e: any) => setDateGenFormat(e.target.value)}
                    style={{ width: "150px" }}
                  >
                    <mdui-menu-item value="short">24.06.</mdui-menu-item>
                    <mdui-menu-item value="medium">24.06.2026</mdui-menu-item>
                    <mdui-menu-item value="weekday">Di 24.06.</mdui-menu-item>
                  </mdui-select>
                </div>

                {/* Preview + generate row */}
                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  {(() => {
                    const preview = buildDateList();
                    const shown = preview.slice(0, 4);
                    return (
                      <>
                        {shown.map((p, i) => (
                          <span key={i} style={{
                            background: "var(--mdui-color-secondary-container, #e8def8)",
                            color: "var(--mdui-color-on-secondary-container, #1d192b)",
                            borderRadius: "6px",
                            padding: "3px 10px",
                            fontSize: "13px",
                            fontWeight: 500,
                          }}>{p}</span>
                        ))}
                        {preview.length > 4 && (
                          <span style={{ fontSize: "13px", color: "var(--mdui-color-outline, #888)" }}>…+{preview.length - 4} weitere ({preview.length} gesamt)</span>
                        )}
                        {preview.length === 0 && (
                          <span style={{ fontSize: "13px", color: "var(--mdui-color-outline, #888)" }}>Wähle Start- und Enddatum</span>
                        )}
                        <mdui-button
                          variant="tonal"
                          icon="auto_fix_high"
                          onClick={generateDates}
                          style={{ marginLeft: "auto" }}
                          disabled={preview.length === 0}
                        >
                          {preview.length > 0 ? `${preview.length} Spalten generieren` : "Generieren"}
                        </mdui-button>
                      </>
                    );
                  })()}
                </div>
              </div>
            </section>

            {/* Section 3 — Spalten (editable list) */}
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--mdui-color-outline, #888)" }}>Spalten ({columnHeaders.length})</p>
                <mdui-button variant="text" icon="add" onClick={addHeader} style={{ marginLeft: "auto" }}>Spalte hinzufügen</mdui-button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {columnHeaders.map((header, index) => (
                  <div key={index}>
                    {/* Row */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "var(--mdui-color-surface-container, #f5f5f5)",
                      borderRadius: "10px",
                      padding: "6px 10px 6px 14px",
                    }}>
                      <span style={{ fontSize: "13px", color: "var(--mdui-color-outline, #888)", minWidth: "28px", fontVariantNumeric: "tabular-nums" }}>#{index + 1}</span>
                      <mdui-text-field
                        value={header}
                        placeholder={`Spalte ${index + 1}`}
                        onInput={(e: React.ChangeEvent<HTMLInputElement>) => handleHeaderChange(index, e.target.value)}
                        style={{ flex: 1 }}
                        variant="filled"
                      />
                      <mdui-button-icon
                        icon="add"
                        title="Spalte darunter einfügen"
                        onClick={() => insertHeaderAfter(index)}
                      />
                      <mdui-button-icon
                        icon="delete_outline"
                        title="Spalte löschen"
                        onClick={() => deleteHeader(index)}
                      />
                    </div>
                  </div>
                ))}

                {columnHeaders.length === 0 && (
                  <div style={{ textAlign: "center", padding: "32px", color: "var(--mdui-color-outline, #888)", border: "2px dashed var(--mdui-color-outline-variant, #e0e0e0)", borderRadius: "12px" }}>
                    Keine Spalten. Generiere Daten oder füge manuell hinzu.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </mdui-dialog>

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
                        .trim() || <span style={{ color: "gray" }}>-</span>}
                    </td>
                    <td>
                      {choices.find((choice) => choice.id === result.id)?.grade || <span style={{ color: "gray" }}>-</span>}
                    </td>
                    <td>
                      {
                        choices.find((choice) => choice.id === result.id)
                          ?.listIndex || <span style={{ color: "gray" }}>-</span>
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
                        ?.title?.replace(/\[.*?\]/g, "") || <span style={{ color: "gray" }}>-</span>}

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
                                    .trim() || <span style={{ color: "gray" }}>-</span>}
                                </td>
                                <td>
                                  {
                                    choices.find(
                                      (choice) => choice.id === result.id
                                    )?.grade || <span style={{ color: "gray" }}>-</span>
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
                                      .trim() || <span style={{ color: "gray" }}>-</span>}
                                  </td>
                                  <td>
                                    {
                                      options.find(
                                        (option) => option.id === result.result
                                      )?.title || <span style={{ color: "gray" }}>-</span>
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
  const vote = await getDoc(doc(db, `schools/SCHOOLID/votes/${id}`));
  const voteData = { id, ...vote.data() } as VoteData;
  const options = (
    await getDocs(collection(db, `schools/SCHOOLID/votes/${id}/options`))
  ).docs.map((doc) => {
    return { id: doc.id, ...doc.data() };
  }) as OptionData[];

  const results = (
    await getDocs(collection(db, `schools/SCHOOLID/votes/${id}/results`))
  ).docs.map((doc) => {
    return { id: doc.id, ...doc.data() };
  }) as ResultData[];

  const choices = (
    await getDocs(collection(db, `schools/SCHOOLID/votes/${id}/choices`))
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

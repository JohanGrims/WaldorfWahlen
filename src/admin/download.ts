import * as XLSX from "xlsx";
import JSZip from "jszip";
import saveAs from "file-saver";
import { Choice, Class, Option, Student, Vote } from "../types";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { snackbar } from "mdui";

/**
 * Downloads the selected votes in the specified file format.
 *
 * @param {string[]} selected - The list of vote IDs to download.
 * @param {any} config - The configuration object for the download.
 * @param {"excel" | "json" | "students"} fileFormat - The file format to download the votes in.
 * @param {any} setDownloadState - The state setter for the download process.
 * @param {any} setSelected - The state setter for the selected votes.
 * @param {any} setStep - The state setter for the current step in the download process.
 */
export async function handleDownload(
  selected: string[],
  config: any,
  fileFormat: "excel" | "json" | "students",
  setDownloadState: any,
  setSelected: any,
  setStep: any
) {
  let data = [] as {
    options: Option[];
    choices: Choice[];
    results: any[];
    id: string;
    selectCount: number;
    title: string;
    extraFields: any[];
    active: boolean;
    startTime?: { seconds: number; nanoseconds: number };
    endTime?: { seconds: number; nanoseconds: number };
  }[];

  for (let i = 0; i < selected.length; i++) {
    const id = selected[i];

    setDownloadState({
      index: i + 1,
      total: selected.length,
      state: "fetching",
    });
    console.log(
      `Fetching data for vote ${id}`,
      i,
      selected.length,
      new Date().toISOString()
    );

    const vote = await getDoc(doc(db, `votes/${id}`));
    const voteData = { id: vote.id, ...vote.data() };
    const options = await getDocs(collection(db, `votes/${id}/options`));
    const optionsData = options.docs.map((doc) => {
      return { id: doc.id, ...doc.data() };
    });
    const choices = await getDocs(collection(db, `votes/${id}/choices`));
    const choicesData = choices.docs.map((doc) => {
      return { id: doc.id, ...doc.data() };
    });
    const results = await getDocs(collection(db, `votes/${id}/results`));
    const resultsData = results.docs.map((doc) => {
      return { id: doc.id, ...doc.data() };
    });

    data.push({
      options: optionsData as Option[],
      choices: choicesData as Choice[],
      results: resultsData as any[],
      ...(voteData as Vote),
    });
  }

  if (fileFormat === "excel") {
    if (config.files === "multiple") {
      const zip = new JSZip();
      setDownloadState({
        state: "writing",
      });
      data.forEach((e) => {
        // Create workbook
        const workbook = XLSX.utils.book_new();

        // Create options worksheet
        const options = e.options.map((option) => {
          return [
            ...(config.references === "id" || config.references === "both"
              ? [option.id]
              : []),

            option.title,
            option.teacher,
            option.max,
            option.description,
          ];
        });
        const optionsWorksheet = XLSX.utils.aoa_to_sheet([
          config.headers
            ? [
                ...(config.references === "id" || config.references === "both"
                  ? ["#"]
                  : []),
                "Titel",
                "Lehrer",
                "Maximale Anzahl",
                "Beschreibung",
              ]
            : [],
          ...options,
        ]);
        XLSX.utils.book_append_sheet(workbook, optionsWorksheet, "Optionen");

        // Create choices worksheet
        const choices = e.choices.map((choice) => {
          return [
            ...(config.references === "id" || config.references === "both"
              ? [choice.id]
              : []),
            choice.name,
            choice.grade,
            ...(config.references === "id" || config.references === "both"
              ? [...choice.selected]
              : []),
            ...(config.references === "both" || config.references === "inline"
              ? [
                  ...choice.selected.map(
                    (id) => e.options.find((option) => option.id === id)?.title
                  ),
                ]
              : []),
            ...choice.extraFields,
            Number(choice.listIndex),
          ];
        });
        const choicesWorksheet = XLSX.utils.aoa_to_sheet([
          config.headers
            ? [
                ...(config.references === "id" || config.references === "both"
                  ? ["#"]
                  : []),
                "Name",
                "Klasse",
                ...(config.references === "id" || config.references === "both"
                  ? Array.from({ length: e.selectCount }).map(
                      (_, i) => `Wahl # ${i + 1}`
                    )
                  : []),
                ...(config.references === "both" ||
                config.references === "inline"
                  ? Array.from({ length: e.selectCount }).map(
                      (_, i) => `Wahl ${i + 1}`
                    )
                  : []),
                ...(e.extraFields ?? []).map((field: any) => field),
                "Liste",
              ]
            : [],
          ...choices,
        ]);
        XLSX.utils.book_append_sheet(workbook, choicesWorksheet, "Wahlen");

        // Create results worksheet
        const results = e.results.map((result: any) => {
          if (config.references === "id") {
            return [result.id, result.result];
          } else if (config.references === "inline") {
            return [
              e.choices.find((choice) => choice.id === result.id)?.name,
              e.options.find((option) => option.id === result.result)?.title,
            ];
          }
          return [
            result.id,
            e.choices.find((choice) => choice.id === result.id)?.name,
            result.result,
            e.options.find((option) => option.id === result.result)?.title,
          ];
        });
        const resultsWorksheet = XLSX.utils.aoa_to_sheet([
          config.headers
            ? [
                ...(config.references === "id" ? ["# Name", "# Ergebnis"] : []),
                ...(config.references === "inline" ? ["Name", "Ergebnis"] : []),
                ...(config.references === "both"
                  ? ["# Name", "Name", "# Ergebnis", "Ergebnis"]
                  : []),
              ]
            : [],
          ...results,
        ]);
        XLSX.utils.book_append_sheet(workbook, resultsWorksheet, "Ergebnisse");

        // Write workbook to binary string
        const fileContent = XLSX.write(workbook, {
          bookType: "xlsx",
          type: "binary",
        });

        // Add to ZIP
        zip.file(
          `${e.title.replace(/[^a-z0-9]/gi, "_") || "Wahl"}.xlsx`,
          fileContent,
          { binary: true }
        );
      });
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, "download.zip");

      setDownloadState({
        state: "idle",
      });
      setSelected([]);
      setStep("select");
    } else {
      setDownloadState({
        state: "writing",
      });
      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Create new sheet for every vote & only show results
      data.forEach((e) => {
        const results = e.results.map((result: any) => {
          return [
            ...(config.references === "id" || config.references === "both" // ID
              ? [result.id]
              : []),
            ...(config.references === "inline" || config.references === "both" // Name
              ? [e.choices.find((choice) => choice.id === result.id)?.name]
              : []),
            ...(config.references === "id" || config.references === "both" // Result ID
              ? [result.result]
              : []),
            ...(config.references === "inline" || config.references === "both" // Result Name
              ? [e.options.find((option) => option.id === result.result)?.title]
              : []),
          ];
        });
        const resultsWorksheet = XLSX.utils.aoa_to_sheet([
          config.headers
            ? [
                ...(config.references === "id" || config.references === "both"
                  ? ["#"]
                  : []),
                ...(config.references === "inline" ||
                config.references === "both"
                  ? ["Name"]
                  : []),
                ...(config.references === "id" || config.references === "both"
                  ? ["#"]
                  : []),
                ...(config.references === "inline" ||
                config.references === "both"
                  ? ["Name"]
                  : []),
              ]
            : [],
          ...results,
        ]);
        XLSX.utils.book_append_sheet(
          workbook,
          resultsWorksheet,
          e.title.replace(/[^a-z0-9]/gi, "_") || "Wahl"
        );
      });
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const blob = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });
      saveAs(blob, `download.xlsx`);

      setDownloadState({
        state: "idle",
      });
      setSelected([]);
      setStep("select");
    }
  }

  if (fileFormat === "json") {
    const zip = new JSZip();
    setDownloadState({
      state: "writing",
    });
    data.forEach((e) => {
      zip.file(
        `${e.title.replace(/[^a-z0-9]/gi, "_") || "Wahl"}.json`,
        JSON.stringify(e),
        { binary: false }
      );
    });
    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveAs(zipBlob, "download.zip");

    setDownloadState({
      state: "idle",
    });
    setSelected([]);
    setStep("select");
  }

  if (fileFormat === "students") {
    const classes = await getDocs(collection(db, "class"));
    const classesData = classes.docs.map((doc) => {
      return { id: doc.id, ...doc.data() };
    }) as Class[];

    const students = classesData.flatMap((c) =>
      c.students.map((s) => ({ ...s, grade: c.grade }))
    ) as Student[];

    let studentsData = students as {
      name: string;
      grade?: number;
      listIndex?: string;
      results?: string[];
    }[];

    data
      .sort((a, b) => (a.startTime?.seconds ?? 0) - (b.startTime?.seconds ?? 0))
      .forEach((vote) => {
        studentsData.forEach((student) => {
          const choice = vote.choices.find(
            (c) => c.grade == student.grade && c.listIndex == student.listIndex
          );
          if (choice) {
            const res = vote.results.find((r) => r.id == choice.id);
            if (res) {
              const opt = vote.options.find((o) => o.id == res.result)?.title;
              student.results = [...(student.results ?? []), opt ?? ""];
            }
          } else {
            student.results = [...(student.results ?? []), ""];
          }
        });
      });

    studentsData.sort((a, b) => {
      if (a.grade === b.grade) {
        return Number(a.listIndex) - Number(b.listIndex);
      }
      return (a.grade ?? 0) - (b.grade ?? 0);
    });

    const workbook = XLSX.utils.book_new();
    const studentsWorksheet = XLSX.utils.aoa_to_sheet([
      [
        "Name",
        "Klasse",
        "#",
        ...data
          .sort(
            (a, b) => (a.startTime?.seconds ?? 0) - (b.startTime?.seconds ?? 0)
          )
          .map((e) => e.title),
      ],
      ...studentsData.map((student) => [
        student.name,
        Number(student.grade),
        Number(student.listIndex),
        ...(student?.results ?? []),
      ]),
    ]);

    XLSX.utils.book_append_sheet(workbook, studentsWorksheet, "Ergebnisse");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });
    saveAs(blob, `download.xlsx`);

    setDownloadState({
      state: "idle",
    });
    setSelected([]);
    setStep("select");

    snackbar({
      message: "Diese Funktion ist noch nicht verfügbar.",
      onClose: () => {
        setDownloadState({
          state: "idle",
        });
        setSelected([]);
        setStep("select");
      },
      autoCloseDelay: 2000,
    });
  }
}

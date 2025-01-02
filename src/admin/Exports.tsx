import { useLoaderData } from "react-router-dom";
import React from "react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase";

import * as XLSX from "xlsx";
import JSZip from "jszip";
import saveAs from "file-saver";
import { Choice, Option, Vote } from "../types";

export default function Exports() {
  const { votes } = useLoaderData() as { votes: any };

  const [filter, setFilter] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );

  const [selected, setSelected] = React.useState<any[]>([]);

  const [step, setStep] = React.useState("select");

  const [fileFormat, setFileFormat] = React.useState<"excel" | "json">("excel");

  const [config, setConfig] = React.useState<{
    files: "single" | "multiple";
    headers: boolean;
    references: "id" | "inline" | "both";
  }>({
    files: "multiple",
    headers: true,
    references: "inline",
  });

  const [downloadState, setDownloadState] = React.useState<{
    index?: number;
    total?: number;
    state: "fetching" | "writing" | "downloading" | "idle";
  }>({
    state: "idle",
  });

  const filteredVotes = votes
    .filter((vote: any) => {
      return (
        vote.title.toLowerCase().includes(search.toLowerCase()) ||
        vote.description?.toLowerCase().includes(search.toLowerCase())
      );
    })
    .filter((vote: any) => {
      return (
        new Date(vote.startTime.seconds * 1000).toISOString().split("T")[0] >=
        fromDate
      );
    })
    .filter((vote: any) => {
      return (
        new Date(vote.startTime.seconds * 1000).toISOString().split("T")[0] <=
        toDate
      );
    })
    .sort((a, b) => {
      return b.startTime.seconds - a.startTime.seconds;
    });

  const selectAll = () => {
    if (selected.length === filteredVotes.length) {
      setSelected([]);
    } else {
      setSelected(filteredVotes.map((vote) => vote.id));
    }
  };

  React.useEffect(() => {
    const download = async () => {
      let data = [] as {
        options: Option[];
        choices: Choice[];
        results: any[];
        id: string;
        selectCount: number;
        title: string;
        extraFields: any[];
        active: boolean;
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

            console.log(e);

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
                    ...(config.references === "id" ||
                    config.references === "both"
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
            XLSX.utils.book_append_sheet(
              workbook,
              optionsWorksheet,
              "Optionen"
            );

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
                ...(config.references === "both" ||
                config.references === "inline"
                  ? [
                      ...choice.selected.map(
                        (id) =>
                          e.options.find((option) => option.id === id)?.title
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
                    ...(config.references === "id" ||
                    config.references === "both"
                      ? ["#"]
                      : []),
                    "Name",
                    "Klasse",
                    ...(config.references === "id" ||
                    config.references === "both"
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
                  e.options.find((option) => option.id === result.result)
                    ?.title,
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
                    ...(config.references === "id"
                      ? ["# Name", "# Ergebnis"]
                      : []),
                    ...(config.references === "inline"
                      ? ["Name", "Ergebnis"]
                      : []),
                    ...(config.references === "both"
                      ? ["# Name", "Name", "# Ergebnis", "Ergebnis"]
                      : []),
                  ]
                : [],
              ...results,
            ]);
            XLSX.utils.book_append_sheet(
              workbook,
              resultsWorksheet,
              "Ergebnisse"
            );

            // Write workbook to binary string
            const fileContent = XLSX.write(workbook, {
              bookType: "xlsx",
              type: "binary",
            });

            // Add to ZIP
            console.log(e.title);
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
                ...(config.references === "inline" ||
                config.references === "both" // Name
                  ? [e.choices.find((choice) => choice.id === result.id)?.name]
                  : []),
                ...(config.references === "id" || config.references === "both" // Result ID
                  ? [result.result]
                  : []),
                ...(config.references === "inline" ||
                config.references === "both" // Result Name
                  ? [
                      e.options.find((option) => option.id === result.result)
                        ?.title,
                    ]
                  : []),
              ];
            });
            const resultsWorksheet = XLSX.utils.aoa_to_sheet([
              config.headers
                ? [
                    ...(config.references === "id" ||
                    config.references === "both"
                      ? ["#"]
                      : []),
                    ...(config.references === "inline" ||
                    config.references === "both"
                      ? ["Name"]
                      : []),
                    ...(config.references === "id" ||
                    config.references === "both"
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
    };

    if (step === "download") {
      download();
    }
  }, [step]);

  if (step === "select") {
    return (
      <div className="mdui-prose">
        <h2>Exportieren</h2>
        <div
          className="flex-gap"
          style={{ alignItems: "center", justifyContent: "start" }}
        >
          <div style={{ width: "3px" }}></div>
          <mdui-button-icon
            variant="filled"
            icon="checklist"
            onClick={selectAll}
          ></mdui-button-icon>
          <mdui-button
            onClick={() => setFilter(!filter)}
            icon="filter_list"
            variant="tonal"
          >
            Filter
          </mdui-button>

          <div style={{ flex: 1 }}></div>
          <span>{selected.length} ausgewählt</span>
          {selected.length > 0 ? (
            <mdui-button
              variant="outlined"
              icon="arrow_forward"
              onClick={() => setStep("file")}
            >
              Fortfahren
            </mdui-button>
          ) : (
            <mdui-button variant="outlined" icon="arrow_forward" disabled>
              Fortfahren
            </mdui-button>
          )}
        </div>
        {filter && (
          <>
            <br />
            <div style={{ display: "flex", gap: "1em" }}>
              <mdui-text-field
                label="Suche"
                variant="outlined"
                value={search}
                onInput={(e: React.FormEvent<HTMLInputElement>) =>
                  setSearch(e.currentTarget.value)
                }
                clearable
              />
              <mdui-text-field
                label="Von"
                variant="outlined"
                type="date"
                value={fromDate}
                onInput={(e: React.FormEvent<HTMLInputElement>) =>
                  setFromDate(
                    new Date(e.currentTarget.value).toISOString().split("T")[0]
                  )
                }
                clearable
              />
              <mdui-text-field
                label="Bis"
                variant="outlined"
                type="date"
                value={toDate}
                onInput={(e: React.FormEvent<HTMLInputElement>) =>
                  setToDate(
                    new Date(e.currentTarget.value).toISOString().split("T")[0]
                  )
                }
                clearable
              />
            </div>
          </>
        )}

        <br />
        <mdui-divider />
        <br />
        <mdui-list>
          {filteredVotes.map((vote: any) => {
            if (selected.includes(vote.id)) {
              return (
                <mdui-list-item
                  key={vote.id}
                  rounded
                  onClick={() =>
                    setSelected(selected.filter((id) => id !== vote.id))
                  }
                  icon="check"
                >
                  <span>{vote.title}</span>
                </mdui-list-item>
              );
            }
            return (
              <mdui-list-item
                key={vote.id}
                rounded
                onClick={() => setSelected([...selected, vote.id])}
                icon="check_box_outline_blank"
              >
                <span>{vote.title}</span>
              </mdui-list-item>
            );
          })}
        </mdui-list>
      </div>
    );
  }

  if (step === "file") {
    return (
      <div className="mdui-prose">
        <div
          className="flex-gap"
          style={{ marginBottom: "30px", alignItems: "center" }}
        >
          <mdui-button-icon
            icon="arrow_back"
            onClick={() => setStep("select")}
          ></mdui-button-icon>
          <h2 style={{ margin: 0 }}>Einstellungen</h2>
        </div>
        <mdui-tabs value={fileFormat}>
          <mdui-tab value="excel" onClick={() => setFileFormat("excel")}>
            <div>
              <h3>XLSX</h3>
              <p>
                Speichern Sie die ausgewählten Daten in einer oder mehreren
                Microsoft Excel Dateien.
              </p>
            </div>
          </mdui-tab>
          <mdui-tab value={"json"} onClick={() => setFileFormat("json")}>
            <div>
              <h3>JSON</h3>
              <p>
                Exportieren Sie die ausgewählten Daten als JSON Datei zur
                Weiterverarbeitung.
              </p>
            </div>
          </mdui-tab>

          <mdui-tab-panel slot="panel" value="excel">
            <br />
            <mdui-segmented-button-group selects="single" value={config.files}>
              <mdui-segmented-button
                value="multiple"
                onClick={() => setConfig({ ...config, files: "multiple" })}
                icon="folder_zip"
              >
                Mehrere Dateien (ZIP)
              </mdui-segmented-button>
              <mdui-segmented-button
                value="single"
                onClick={() => setConfig({ ...config, files: "single" })}
                icon="description"
              >
                Eine Datei
              </mdui-segmented-button>
            </mdui-segmented-button-group>
            <span style={{ marginLeft: "10px" }}>
              {config.files === "multiple"
                ? "Erstellen Sie eine separate Datei für jede ausgewählte Wahl."
                : "Erstellen Sie eine einzige Datei für alle ausgewählten Wahlen."}
            </span>
            <p />
            <mdui-segmented-button-group
              selects="single"
              value={config.references}
            >
              <mdui-segmented-button
                value="id"
                onClick={() => setConfig({ ...config, references: "id" })}
                icon="link"
              >
                Verknüpf. mit ID
              </mdui-segmented-button>
              <mdui-segmented-button
                value="inline"
                onClick={() => setConfig({ ...config, references: "inline" })}
                icon="text_snippet"
              >
                als Text
              </mdui-segmented-button>
              <mdui-segmented-button
                value="both"
                onClick={() => setConfig({ ...config, references: "both" })}
                icon="link_off"
              >
                Beides
              </mdui-segmented-button>
            </mdui-segmented-button-group>
            <span style={{ marginLeft: "10px" }}>
              {config.references === "id"
                ? "Referenzen sind als ID enthalten. Nutzen Sie Verweise, um die Daten anzuzeigen."
                : config.references === "inline"
                ? "Referenzen sind als Klartext in der Datei enthalten."
                : "Referenzen sind als ID und Klartext enthalten."}
            </span>
            <p />
            <mdui-segmented-button-group
              selects="single"
              value={config.headers}
            >
              <mdui-segmented-button
                value={true}
                onClick={() => setConfig({ ...config, headers: true })}
                icon="table_chart"
              >
                Mit Kopfzeile
              </mdui-segmented-button>
              <mdui-segmented-button
                value={false}
                onClick={() => setConfig({ ...config, headers: false })}
                icon="table_rows"
              >
                Ohne Kopfzeile
              </mdui-segmented-button>
            </mdui-segmented-button-group>
            <span style={{ marginLeft: "10px" }}>
              {config.headers
                ? "Die Kopfzeile enthält die Spaltennamen."
                : "Die Kopfzeile enthält keine Spaltennamen."}
            </span>
            <p />
            <br />
          </mdui-tab-panel>

          <mdui-tab-panel slot="panel" value="json"></mdui-tab-panel>
        </mdui-tabs>

        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: 1000,
          }}
        >
          <mdui-fab
            extended
            variant="primary"
            icon="downloading"
            onClick={() => setStep("download")}
          >
            Herunterladen
          </mdui-fab>
        </div>
      </div>
    );
  }

  if (step === "download") {
    return (
      <div className="mdui-prose">
        {downloadState.state === "idle" && (
          <div>
            <mdui-linear-progress />
            <h2
              style={{
                textAlign: "center",
                margin: "20px",
              }}
            >
              Der Download wurde gestartet.
            </h2>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <mdui-icon style={{ fontSize: "100px" }}>done</mdui-icon>
            </div>
          </div>
        )}
        {downloadState.state === "fetching" && (
          <div>
            <mdui-linear-progress
              value={downloadState.index}
              max={(downloadState.total ?? 0) + 1}
            />
            <h2
              style={{
                textAlign: "center",
                margin: "20px",
              }}
            >
              Die Daten werden abgerufen.
            </h2>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <mdui-icon style={{ fontSize: "100px" }}>
                cloud_download
              </mdui-icon>
            </div>
          </div>
        )}
        {downloadState.state === "writing" && (
          <div>
            <mdui-linear-progress />
            <h2
              style={{
                textAlign: "center",
                margin: "20px",
              }}
            >
              Die Dateien werden erstellt.
            </h2>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <mdui-icon style={{ fontSize: "100px" }}>create</mdui-icon>
            </div>
          </div>
        )}
        {downloadState.state === "downloading" && (
          <div>
            <mdui-linear-progress />
            <h2
              style={{
                textAlign: "center",
                margin: "20px",
              }}
            >
              Der Download wird gestartet.
            </h2>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <mdui-icon style={{ fontSize: "100px" }}>downloading</mdui-icon>
            </div>
          </div>
        )}
      </div>
    );
  }
}

Exports.loader = async () => {
  const votes = await getDocs(collection(db, "votes"));
  const votesArray = votes.docs.map((doc) => {
    return { id: doc.id, ...doc.data() };
  });

  return { votes: votesArray };
};

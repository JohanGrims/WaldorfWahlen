import { useLoaderData } from "react-router-dom";
import React from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

import { sortVotes } from "./utils";
import { handleDownload } from "./download";

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

  const [fileFormat, setFileFormat] = React.useState<
    "excel" | "json" | "students"
  >("excel");

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

  const filteredVotes = sortVotes(votes, search, fromDate, toDate);

  const selectAll = () => {
    if (selected.length === filteredVotes.length) {
      setSelected([]);
    } else {
      setSelected(filteredVotes.map((vote) => vote.id));
    }
  };

  React.useEffect(() => {
    if (step === "download") {
      handleDownload(
        selected,
        config,
        fileFormat,
        setDownloadState,
        setSelected,
        setStep
      );
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
          <mdui-tab
            value={"students"}
            onClick={() => setFileFormat("students")}
          >
            <div>
              <h3>
                SchülerInnen<mdui-badge>beta</mdui-badge>
              </h3>
              <p>
                Erstellen Sie eine Übersicht für die ausgewählten Daten zu den
                SchülerInnen.
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

          <mdui-tab-panel slot="panel" value="json">
            <br />
            <b>Es sind keine Einstellungen möglich.</b>
            <p />
            JSON (JavaScript Object Notation) ist ein einfaches Datenformat, das
            für den Datenaustausch zwischen Anwendungen verwendet wird. Es ist
            einfach zu lesen und zu schreiben und basiert auf einer Untergruppe
            der JavaScript-Programmiersprache.
          </mdui-tab-panel>

          <mdui-tab-panel slot="panel" value="students">
            <br />
            <b>Es sind keine Einstellungen möglich.</b>
            <p />
            Diese Funktion gibt für jede/n SchülerIn eine Übersicht über die
            Ergebnisse aus. Das Format ist eine Excel Datei (.xlsx) mit
            folgendem Format: <br />
            <table className="mdui-table">
              <thead>
                <tr>
                  <th>
                    <b>Name</b>
                  </th>
                  <th>
                    <b>Klasse</b>
                  </th>
                  <th>
                    <b>#</b>
                  </th>
                  <th>
                    <b>Wahl ABC</b>
                  </th>
                  <th>
                    <b>Wahl XYZ</b>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Max Mustermann</td>
                  <td>11</td>
                  <td>1</td>
                  <td>Option X</td>
                  <td>Option Y</td>
                </tr>
                <tr>
                  <td>Erika Musterfrau</td>
                  <td>11</td>
                  <td>4</td>
                  <td>Option A</td>
                  <td>Option Z</td>
                </tr>
              </tbody>
            </table>
          </mdui-tab-panel>
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

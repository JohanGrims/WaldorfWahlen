import { useLoaderData } from "react-router-dom";
import React from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

import * as XLSX from "xlsx";
import JSZip from "jszip";
import { saveAs } from "file-saver";

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

  const [fileFormat, setFileFormat] = React.useState<"excel" | "pdf" | "json">(
    "excel"
  );

  const [config, setConfig] = React.useState<{
    files: "single" | "multiple";
    headers: boolean;
    references: "id" | "inline" | "both";
  }>({
    files: "multiple",
    headers: true,
    references: "inline",
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

  const handleDownload = async () => {
    const zip = new JSZip();

    // Create multiple Excel files
    const data = [
      {
        name: "File1",
        content: [
          ["Name", "Age"],
          ["John", 25],
          ["Doe", 30],
        ],
      },
      {
        name: "File2",
        content: [
          ["Product", "Price"],
          ["Apple", 1.5],
          ["Orange", 2],
        ],
      },
    ];

    data.forEach(({ name, content }) => {
      // Create workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(content);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

      // Write workbook to binary string
      const fileContent = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "binary",
      });

      // Add to ZIP
      zip.file(`${name}.xlsx`, fileContent, { binary: true });
    });

    // Generate ZIP file
    const zipBlob = await zip.generateAsync({ type: "blob" });

    // Trigger download
    saveAs(zipBlob, "download.zip");
  };

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
          <mdui-tab value={"pdf"} onClick={() => setFileFormat("pdf")}>
            <div>
              <h3>PDF</h3>
              <p>
                Archivieren Sie die ausgewählten Daten als ausdruckbare PDF
                Datei zur Weitergabe.
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
            <mdui-switch
              checked={config.headers}
              onInput={(e: any) =>
                setConfig({ ...config, headers: e.target.checked })
              }
            />
            <span>Header</span>

            <mdui-switch
              checked={config.files === "single"}
              onInput={(e: any) =>
                setConfig({
                  ...config,
                  files: e.target.checked ? "single" : "multiple",
                })
              }
            />
            <span>Single File</span>

            <mdui-switch
              checked={config.references === "id"}
              onInput={(e: any) =>
                setConfig({
                  ...config,
                  references: e.target.checked ? "id" : "inline",
                })
              }
            />
            <span>References</span>

            <br />
          </mdui-tab-panel>
          <mdui-tab-panel slot="panel" value="pdf">
            <mdui-switch
              checked={config.headers}
              onInput={(e: any) =>
                setConfig({ ...config, headers: e.target.checked })
              }
            />
            <span>Header</span>
            <br />
          </mdui-tab-panel>

          <mdui-tab-panel slot="panel" value="json">
            <mdui-switch
              checked={config.headers}
              onInput={(e: any) =>
                setConfig({ ...config, headers: e.target.checked })
              }
            />
            <span>Header</span>
            <br />
          </mdui-tab-panel>
        </mdui-tabs>
        <p />
        <mdui-button onClick={handleDownload}>Test</mdui-button>

        {JSON.stringify(config)}
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

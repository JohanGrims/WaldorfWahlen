import { saveAs } from "file-saver";
import React from "react";
import { useLoaderData } from "react-router-dom";
import * as XLSX from "xlsx";

export default function Export() {
  const { vote, choices, options, results } = useLoaderData();

  const [selected, setSelected] = React.useState([
    {
      title: "Metadaten",
      checked: true,
    },
    {
      title: "Optionen",
      checked: true,
    },
    {
      title: "Antworten",
      checked: true,
    },
    {
      title: "Ergebnisse",
      checked: true,
    },
  ]);
  const [selectDialog, setSelectDialog] = React.useState(false);

  const downloadExcel = async (
    exportMeta = true,
    exportOptions = true,
    exportChoices = true,
    exportResults = true
  ) => {
    const workbook = XLSX.utils.book_new();
    if (exportMeta) {
      const meta = XLSX.utils.json_to_sheet([
        {
          title: vote.title,
          startTime: new Date(vote.startTime.seconds * 1000).toISOString(),
          endTime: new Date(vote.endTime.seconds * 1000).toISOString(),
          selectCount: vote.selectCount,
          active: vote.active,
          version: vote.version,
          extraFiels: vote.extraFiels?.join(", "),
        },
      ]);
      XLSX.utils.book_append_sheet(workbook, meta, "Meta");
    }
    if (exportOptions) {
      const optionsSheet = XLSX.utils.json_to_sheet(options);
      XLSX.utils.book_append_sheet(workbook, optionsSheet, "Options");
    }
    if (exportChoices) {
      const choicesSheet = XLSX.utils.json_to_sheet([
        ...choices.map((e) => ({
          ...e,
          selected: e.selected
            .map((e) => options.find((o) => o.id === e).title)
            .join(", "),
          extraFiels: e.extraFiels?.join(", "),
        })),
      ]);
      XLSX.utils.book_append_sheet(workbook, choicesSheet, "Choices");
    }
    if (exportResults) {
      const resultsSheet = XLSX.utils.json_to_sheet(results);
      XLSX.utils.book_append_sheet(workbook, resultsSheet, "Results");
    }
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });
    saveAs(blob, `${vote.title}.xlsx`);
  };

  return (
    <div className="mdui-prose">
      <h2>Exportieren</h2>
      <p></p>
      {selectDialog && (
        <mdui-dialog
          headline="Daten auswählen"
          description="Wählen Sie aus, welche Daten Sie exportieren möchten. Sie können auch nur bestimmte Daten exportieren."
          onConfirm={() => {
            setSelectDialog(false);
            downloadExcel(...selected);
          }}
          onCancel={() => setSelectDialog(false)}
          open
        >
          {selected.map((e, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                width: "100%",
              }}
            >
              {e.checked ? (
                <mdui-switch
                  checked
                  onInput={() => {
                    const newSelected = [...selected];
                    newSelected[index].checked = false;
                    setSelected(newSelected);
                  }}
                  checked-icon="add"
                  unchecked-icon="remove"
                />
              ) : (
                <mdui-switch
                  onInput={() => {
                    const newSelected = [...selected];
                    newSelected[index].checked = true;
                    setSelected(newSelected);
                  }}
                  checked-icon="add"
                  unchecked-icon="remove"
                />
              )}
              <label>{e.title}</label>

              <p />
            </div>
          ))}
          <p />
          <mdui-button
            slot="action"
            variant="text"
            onClick={() => setSelectDialog(false)}
          >
            Abbrechen
          </mdui-button>
          <mdui-button
            slot="action"
            variant="filled"
            onClick={() => {
              setSelectDialog(false);
              const exportMeta = selected.find(
                (item) => item.title === "Metadaten"
              ).checked;
              const exportOptions = selected.find(
                (item) => item.title === "Optionen"
              ).checked;
              const exportChoices = selected.find(
                (item) => item.title === "Antworten"
              ).checked;
              const exportResults = selected.find(
                (item) => item.title === "Ergebnisse"
              ).checked;
              downloadExcel(
                exportMeta,
                exportOptions,
                exportChoices,
                exportResults
              );
            }}
          >
            Exportieren
          </mdui-button>
        </mdui-dialog>
      )}

      <mdui-card
        variant="filled"
        style={{ width: "100%", padding: "20px" }}
        clickable
        onClick={downloadExcel}
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
              <h2>Alle Daten exportieren</h2>
              <mdui-icon name="done_all"></mdui-icon>
            </div>
            <div>Excel (xlsx)</div>
          </div>
          Laden Sie alle Daten in einer Excel Datei herunter. Dazu gehören alle
          Optionen, Metadaten, Antworten und Ergebnisse.
        </div>
      </mdui-card>
      <mdui-card
        variant="outlined"
        style={{ width: "100%", padding: "20px" }}
        clickable
        onClick={() => setSelectDialog(true)}
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
              <h2>Daten auswählen</h2>
              <mdui-icon name="toggle_on"></mdui-icon>
            </div>
            <div>Excel (xlsx)</div>
          </div>
          Wählen Sie aus, welche Daten Sie exportieren möchten. Sie können auch
          nur bestimmte Daten exportieren.
        </div>
      </mdui-card>
    </div>
  );
}

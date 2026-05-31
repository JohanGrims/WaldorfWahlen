import React, { useState } from "react";
import { useLoaderData } from "react-router-dom";
import { V2LoaderData } from "./V2Layout";
import { useDecryption } from "../../contexts";
import * as XLSX from "xlsx";
import { alert } from "mdui";

export default function V2Exports() {
  const { vote, options, results } = useLoaderData() as V2LoaderData;
  const { students } = useDecryption();
  
  const [exporting, setExporting] = useState(false);

  const handleExportCSV = () => {
    setExporting(true);
    try {
      const data: any[] = [];
      const optionMap = new Map(options.map(opt => [opt.id, opt.title]));
      const resultMap = new Map(results.map(res => [res.id, res.result]));

      for (const student of students) {
        const resultId = resultMap.get(student.token);
        const projectName = resultId ? optionMap.get(resultId) || "Projekt gelöscht" : "Nicht zugeteilt";
        
        data.push({
          Name: student.name,
          Klasse: student.grade,
          "E-Mail": student.email,
          "Zuteilung": projectName
        });
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Zuteilung");
      XLSX.writeFile(workbook, `Zuteilung_${vote.title.replace(/ /g, "_")}.xlsx`);
    } catch (err) {
      console.error(err);
      alert({ headline: "Fehler", description: "Fehler beim Exportieren der Daten." });
    }
    setExporting(false);
  };

  const handleExportClassesCSV = () => {
    setExporting(true);
    try {
      const optionMap = new Map(options.map(opt => [opt.id, opt.title]));
      const resultMap = new Map(results.map(res => [res.id, res.result]));

      const byClass: Record<number, any[]> = {};

      for (const student of students) {
        if (!byClass[student.grade]) byClass[student.grade] = [];
        
        const resultId = resultMap.get(student.token);
        const projectName = resultId ? optionMap.get(resultId) || "Projekt gelöscht" : "Nicht zugeteilt";
        
        byClass[student.grade].push({
          Name: student.name,
          "Zuteilung": projectName
        });
      }

      const workbook = XLSX.utils.book_new();
      for (const grade of Object.keys(byClass).sort()) {
        const worksheet = XLSX.utils.json_to_sheet(byClass[parseInt(grade)]);
        XLSX.utils.book_append_sheet(workbook, worksheet, `Klasse ${grade}`);
      }
      
      XLSX.writeFile(workbook, `Klassen_Zuteilung_${vote.title.replace(/ /g, "_")}.xlsx`);
    } catch (err) {
      console.error(err);
      alert({ headline: "Fehler", description: "Fehler beim Exportieren der Daten." });
    }
    setExporting(false);
  };

  return (
    <div className="mdui-prose">
      <h2>Exportieren</h2>
      <p>
        Hier können Sie die entschlüsselten Ergebnisse und Zuteilungen exportieren. 
        Die Daten werden lokal im Browser mit der hochgeladenen Excel-Datei zusammengeführt 
        und verlassen Ihren Rechner zu keinem Zeitpunkt im Klartext.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 32 }}>
        <mdui-card variant="outlined" style={{ padding: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3>Alle Schüler (Excel)</h3>
            <p style={{ margin: 0, color: "var(--mdui-color-on-surface-variant)" }}>
              Eine Gesamtliste mit Name, Klasse, E-Mail und der finalen Zuteilung.
            </p>
          </div>
          <mdui-button icon="download" onClick={handleExportCSV} disabled={exporting}>Herunterladen</mdui-button>
        </mdui-card>

        <mdui-card variant="outlined" style={{ padding: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3>Nach Klassen (Excel)</h3>
            <p style={{ margin: 0, color: "var(--mdui-color-on-surface-variant)" }}>
              Eine Excel-Datei mit einem separaten Tabellenblatt für jede Klasse. Ideal zum Aushängen oder Verteilen an Klassenlehrer.
            </p>
          </div>
          <mdui-button icon="download" onClick={handleExportClassesCSV} disabled={exporting}>Herunterladen</mdui-button>
        </mdui-card>
      </div>
    </div>
  );
}

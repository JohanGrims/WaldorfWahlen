import React, { useState } from "react";

function CSVFileUpload({ upload }) {
  const [csvData, setCsvData] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const csv = e.target.result;
      const lines = csv.split("\n");
      const data = lines.map((line) =>
        line.split(";").map((cell) => cell.trim())
      );
      setCsvData(data);
    };

    reader.readAsText(file);
  };

  return (
    <div>
      <input
        className="button "
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
      />
      {csvData && (
        <div>
          <h3>Vorschau</h3>
          <table style={{ width: "100%" }}>
            <tbody>
              {csvData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell.replaceAll('"', "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p />
          <button
            className="button"
            onClick={() => {
              upload(csvData);
            }}
          >
            Veröffentlichen
          </button>
        </div>
      )}
    </div>
  );
}

export default CSVFileUpload;

import { useLoaderData } from "react-router-dom";
import React from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

import * as XLSX from "xlsx";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export default function Exports() {
  const { votes } = useLoaderData() as { votes: any };

  const [search, setSearch] = React.useState("");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );

  const [selected, setSelected] = React.useState<any[]>([]);

  const [step, setStep] = React.useState("select");

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
          <mdui-dropdown>
            <mdui-button icon="filter_list" variant="tonal" slot="trigger">
              Filter
            </mdui-button>
            <mdui-card
              style={{
                padding: "1em",
                display: "flex",
                flexDirection: "column",
                gap: "1em",
              }}
            >
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
            </mdui-card>
          </mdui-dropdown>

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
        <h2>Einstellungen</h2>
        <mdui-button onClick={handleDownload}>Test</mdui-button>
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

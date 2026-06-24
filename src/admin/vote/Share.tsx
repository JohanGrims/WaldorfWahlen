import React from "react";
import QRCode from "react-qr-code";
import { useLoaderData, useParams } from "react-router-dom";
import { Vote } from "../../types";

import jsPDF from "jspdf";
import { formatBerlinTimestamp } from "../../utils/date";
import { snackbar } from "mdui";
import { auth, db } from "../../firebase";
import { collection, getDocs, DocumentData } from "firebase/firestore";
import { Canvg } from "canvg";

interface StudentData extends DocumentData {
  name: string;
  listIndex: number;
  email?: string;
}

interface ClassData extends DocumentData {
  id: string;
  grade: number;
  students: StudentData[];
}

export default function Share() {
  const { id } = useParams<{ id: string }>();
  const { vote } = useLoaderData() as { vote: Vote };
  const [allowResubmission, setAllowResubmission] = React.useState(false);

  const [classes, setClasses] = React.useState<ClassData[]>([]);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    async function loadClasses() {
      try {
        const classSnapshot = await getDocs(
          collection(db, "schools/SCHOOLID/class")
        );
        const classData = classSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ClassData[];
        setClasses(classData);
      } catch (error) {
        console.error("Error loading classes:", error);
      }
    }

    loadClasses();
  }, []);

  const filteredStudents = React.useMemo(() => {
    if (!search.trim()) return [];
    const query = search.toLowerCase();
    const results: (StudentData & { grade: number; classId: string })[] = [];
    
    for (const cls of classes) {
      if (!cls.students) continue;
      for (const student of cls.students) {
        if (student.name.toLowerCase().includes(query)) {
          results.push({ ...student, grade: cls.grade, classId: cls.id });
        }
      }
    }
    return results.slice(0, 10); // Limit to 10 results
  }, [search, classes]);

  // Styles grouped for readability
  const styles: { [k: string]: React.CSSProperties } = {
    container: { maxWidth: 500, margin: "0 auto", padding: 28 },
    header: { textAlign: "center", marginBottom: 6 },
    subtitle: { textAlign: "center", color: "#777", marginTop: 6 },
    date: { textAlign: "center", fontSize: 14, color: "#666", marginTop: 8 },
    centerCol: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 18,
      marginTop: 14,
    },
    qrBox: {
      background: "white",
      padding: 18,
      borderRadius: 10,
      boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
    },
    linkRow: { width: "100%", marginTop: 6 },
    switchRow: { display: "flex", alignItems: "center", gap: 12 },
    buttonsRow: {
      display: "flex",
      gap: 12,
      marginTop: 12,
      flexWrap: "wrap",
      justifyContent: "center",
    },
  };

  const url = React.useMemo(() => {
    if (!id) return window.location.origin;
    return allowResubmission
      ? `${window.location.origin}/v/${id}?a`
      : `${window.location.origin}/v/${id}`;
  }, [allowResubmission, id]);

  const formatTs = React.useCallback((ts: any) => {
    if (!ts) return "";
    return formatBerlinTimestamp(ts.seconds, "dd.MM.yyyy HH:mm");
  }, []);

  const copyText = React.useCallback(
    async (text: string, message = "Kopiert") => {
      try {
        await navigator.clipboard.writeText(text);
        snackbar({ message });
      } catch (err) {
        snackbar({ message: "Kopieren fehlgeschlagen." });
      }
    },
    []
  );

  const downloadQRCodePNG = React.useCallback(async () => {
    const qrSvg = document.getElementById("qr-svg");
    if (!qrSvg) {
      snackbar({ message: "QR-Code nicht gefunden." });
      return;
    }
    try {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(qrSvg);
      const canvas = document.createElement("canvas");
      const bbox = qrSvg.getBoundingClientRect();
      canvas.width = Math.max(180, Math.round(bbox.width || 180));
      canvas.height = Math.max(180, Math.round(bbox.height || 180));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas konnte nicht erstellt werden.");
      const canvgInstance = await Canvg.fromString(ctx, svgString);
      await canvgInstance.render();
      canvas.toBlob((blob) => {
        if (!blob) {
          snackbar({ message: "PNG konnte nicht erzeugt werden." });
          return;
        }
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "qrcode.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        snackbar({ message: "PNG erfolgreich heruntergeladen." });
      }, "image/png");
    } catch (err) {
      snackbar({ message: "Fehler beim Exportieren des QR-Codes." });
    }
  }, []);

  const handleExportPDF = React.useCallback(async () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 32;

    doc.setFontSize(28);
    doc.setTextColor(33, 33, 33);
    doc.text(vote.title || "Wahl teilen", pageWidth / 2, y, {
      align: "center",
    });
    y += 14;

    if (vote.description) {
      doc.setFontSize(16);
      doc.setTextColor(100, 100, 100);
      const lines = doc.splitTextToSize(vote.description, pageWidth - 48);
      doc.text(lines, pageWidth / 2, y, {
        align: "center",
      });
      y += (lines.length * 8) + 8;
    }

    if (vote.startTime && vote.endTime) {
      const start = formatTs(vote.startTime);
      const end = formatTs(vote.endTime);
      doc.setFontSize(14);
      doc.setTextColor(60, 60, 60);
      doc.text(`Abgabe: ${start} bis ${end}`, pageWidth / 2, y, {
        align: "center",
      });
      y += 14;
    }

    const qrSvg = document.getElementById("qr-svg");
    if (qrSvg) {
      try {
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(qrSvg);
        const canvas = document.createElement("canvas");
        const qrSize = 80; // mm in PDF
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas konnte nicht erstellt werden.");
        const canvgInstance = await Canvg.fromString(ctx, svgString);
        await canvgInstance.render();
        const imgData = canvas.toDataURL("image/png");
        doc.addImage(
          imgData,
          "PNG",
          (pageWidth - qrSize) / 2,
          y,
          qrSize,
          qrSize
        );
        y += qrSize + 6;
        doc.setFontSize(12);
        doc.setTextColor(80, 80, 80);
        doc.text(url, pageWidth / 2, y, {
          align: "center",
          maxWidth: pageWidth - 40,
        });
        y += 10;
        doc.setFontSize(12);
        doc.setTextColor(150, 150, 150);
        doc.text("Scannen zum Teilnehmen an der Wahl", pageWidth / 2, y, {
          align: "center",
        });
        const footerY = doc.internal.pageSize.getHeight() - 18;
        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        const userEmail = auth.currentUser?.email || "";
        const dateStr = new Date().toLocaleDateString();
        doc.text(
          `Generiert am ${dateStr} von ${userEmail} mit WaldorfWahlen.`,
          pageWidth / 2,
          footerY,
          { align: "center" }
        );
        doc.save("wahl-info.pdf");
      } catch (err) {
        snackbar({ message: "Fehler beim Exportieren des QR-Codes in PDF." });
        doc.save("wahl-info.pdf");
      }
    } else {
      doc.save("wahl-info.pdf");
    }
  }, [vote, url, formatTs]);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 28 }}>
      <h2 style={{ textAlign: "center", marginBottom: 8, fontSize: "2rem" }}>{vote.title || "Wahl teilen"}</h2>
      {vote.description && <p style={{ textAlign: "center", color: "rgba(var(--mdui-color-on-surface), 0.7)", marginBottom: 16, whiteSpace: "pre-wrap", maxWidth: 600, margin: "0 auto 16px auto" }}>{vote.description}</p>}
      {vote.startTime && vote.endTime && (
        <p style={{ textAlign: "center", color: "rgba(var(--mdui-color-primary), 1)", marginBottom: 32 }}>
          Abgabe: <b>{formatTs(vote.startTime)}</b> bis <b>{formatTs(vote.endTime)}</b>
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
        
        {/* General Share Card */}
        <mdui-card variant="filled" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <h3 style={{ margin: "0 0 4px 0" }}>Allgemeiner Wahl-Link</h3>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "rgba(var(--mdui-color-on-surface), 0.6)" }}>
              Teilen Sie diesen Link mit allen Schülern, die selbstständig ihre Daten eingeben sollen.
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "center", padding: "16px", background: "white", borderRadius: "12px", alignSelf: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <QRCode id="qr-svg" value={url} size={180} />
          </div>
          
          <mdui-text-field
            label="Link kopieren"
            value={url}
            readonly
            style={{ width: "100%" }}
          >
            <mdui-button-icon
              slot="end-icon"
              icon="content_copy"
              onClick={() => copyText(url, "Link kopiert")}
            />
          </mdui-text-field>

          <div style={{ display: "flex", gap: "12px" }}>
            <mdui-button variant="tonal" icon="image" style={{ flex: 1 }} onClick={downloadQRCodePNG}>QR PNG</mdui-button>
            <mdui-button variant="tonal" icon="picture_as_pdf" style={{ flex: 1 }} onClick={handleExportPDF}>Aushang PDF</mdui-button>
            <mdui-button variant="filled" icon="share" style={{ flex: 1 }} onClick={() => {
              if (navigator.share) {
                navigator.share({ title: "Wahl", text: url });
              } else {
                copyText(url, "Link kopiert");
              }
            }}>Teilen</mdui-button>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", marginTop: "auto", paddingTop: "12px", borderTop: "1px solid rgba(var(--mdui-color-outline), 0.2)" }}>
            <mdui-switch
              checked={allowResubmission}
              onChange={(e) => setAllowResubmission((e.target as HTMLInputElement).checked)}
            />
            <span style={{ fontSize: "0.95rem" }}>Mehrfache Abgabe pro Browser erlauben</span>
          </label>
        </mdui-card>

        {/* Personalized Links Card */}
        <mdui-card variant="filled" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <h3 style={{ margin: "0 0 4px 0" }}>Personalisierte Links</h3>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "rgba(var(--mdui-color-on-surface), 0.6)" }}>
              Suchen Sie nach einem Schüler, um einen Link zu erstellen, bei dem Name und Klasse bereits ausgefüllt sind.
            </p>
          </div>
          
          <mdui-text-field
            icon="search"
            placeholder="Name eingeben..."
            value={search}
            onInput={(e: any) => setSearch(e.target.value)}
            style={{ width: "100%" }}
            clearable
          ></mdui-text-field>

          {search.trim() && filteredStudents.length > 0 && (
            <mdui-list style={{ width: "100%", background: "transparent", flex: 1, overflowY: "auto", minHeight: 0, maxHeight: "350px" }}>
              {filteredStudents.map((student) => {
                const studentUrl = `${window.location.origin}/v/${id}?name=${encodeURIComponent(student.name)}&grade=${student.grade}&listIndex=${student.listIndex}`;
                return (
                  <mdui-list-item
                    key={`${student.grade}-${student.listIndex}`}
                    headline={student.name}
                    description={`Klasse ${student.grade}`}
                    rounded
                  >
                    <div slot="end-icon" style={{ display: "flex", gap: "4px" }}>
                      <mdui-button-icon
                        icon="content_copy"
                        onClick={() => copyText(studentUrl, `Link für ${student.name} kopiert`)}
                      />
                      <mdui-button-icon
                        icon="share"
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({ title: `Wahl-Link für ${student.name}`, text: studentUrl });
                          } else {
                            copyText(studentUrl, `Link für ${student.name} kopiert`);
                          }
                        }}
                      />
                    </div>
                  </mdui-list-item>
                );
              })}
            </mdui-list>
          )}
          
          {search.trim() && filteredStudents.length === 0 && (
            <div style={{ padding: "32px 0", textAlign: "center", color: "rgba(var(--mdui-color-on-surface), 0.5)" }}>
              <mdui-icon name="person_search" style={{ fontSize: "3rem", marginBottom: "8px" }}></mdui-icon>
              <div>Keine Schüler gefunden.</div>
            </div>
          )}

          {!search.trim() && (
            <div style={{ padding: "32px 0", textAlign: "center", color: "rgba(var(--mdui-color-on-surface), 0.3)", marginTop: "auto", marginBottom: "auto" }}>
              <mdui-icon name="search" style={{ fontSize: "4rem", marginBottom: "8px" }}></mdui-icon>
              <div>Tippen Sie einen Namen ein, um zu suchen.</div>
            </div>
          )}
        </mdui-card>
      </div>
    </div>
  );
}

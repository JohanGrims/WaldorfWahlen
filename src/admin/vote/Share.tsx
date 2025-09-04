import React from "react";
import QRCode from "react-qr-code";
import { useLoaderData, useParams } from "react-router-dom";
import { Vote } from "../../types";

import jsPDF from "jspdf";
import moment from "moment-timezone";
import { snackbar } from "mdui";
import { auth } from "../../firebase";
import { Canvg } from "canvg";

export default function Share() {
  const { id } = useParams<{ id: string }>();
  const { vote } = useLoaderData() as { vote: Vote };
  const [allowResubmission, setAllowResubmission] = React.useState(false);

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
      ? `${window.location.origin}/v/${id}?a=true`
      : `${window.location.origin}/v/${id}`;
  }, [allowResubmission, id]);

  const formatTs = React.useCallback((ts: any) => {
    if (!ts) return "";
    return moment
      .tz(ts.seconds * 1000, "Europe/Berlin")
      .format("DD.MM.YYYY HH:mm");
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
      doc.text(vote.description, pageWidth / 2, y, {
        align: "center",
        maxWidth: pageWidth - 48,
      });
      y += 18;
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
    <div style={styles.container}>
      <h2 style={styles.header}>{vote.title || "Wahl teilen"}</h2>
      {vote.description && <p style={styles.subtitle}>{vote.description}</p>}
      {vote.startTime && vote.endTime && (
        <p style={styles.date}>
          Abgabe vom: <b>{formatTs(vote.startTime)}</b> bis{" "}
          <b>{formatTs(vote.endTime)}</b>
        </p>
      )}

      <div style={styles.centerCol}>
        <div style={styles.qrBox}>
          <QRCode id="qr-svg" value={url} size={200} />
        </div>

        <div style={styles.linkRow}>
          <mdui-text-field
            label="Wahl-Link"
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
        </div>

        <div style={styles.buttonsRow}>
          <mdui-button
            icon="image"
            style={styles.actionButton}
            onClick={downloadQRCodePNG}
          >
            QR-Code
          </mdui-button>

          <mdui-button
            icon="picture_as_pdf"
            style={styles.actionButton}
            onClick={handleExportPDF}
          >
            PDF
          </mdui-button>

          <mdui-button
            icon="share"
            style={styles.actionButton}
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: "Wahl", text: url });
              } else {
                copyText(url, "Link kopiert (Teilen nicht unterstützt)");
              }
            }}
          >
            Teilen
          </mdui-button>
        </div>

        <div style={styles.switchRow}>
          <mdui-switch
            checked={allowResubmission}
            onChange={(e) =>
              setAllowResubmission((e.target as HTMLInputElement).checked)
            }
            style={{ fontSize: 18 }}
          />
          <span style={{ fontWeight: 500 }}>
            Nutzern erlauben, mehrfach eine Wahl abzugeben
          </span>
        </div>
      </div>
    </div>
  );
}

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

  // Build URL
  const url = allowResubmission
    ? `${window.location.origin}/v/${id}?allowResubmission=true`
    : `${window.location.origin}/v/${id}`;

  // PDF Export
  const handleExportPDF = async () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 32; // More top padding
    // Title
    doc.setFontSize(30);
    doc.setTextColor(33, 33, 33);
    doc.text(vote.title || "Wahl teilen", pageWidth / 2, y, {
      align: "center",
    });
    y += 16;
    // Description
    if (vote.description) {
      doc.setFontSize(18);
      doc.setTextColor(100, 100, 100);
      doc.text(vote.description, pageWidth / 2, y, {
        align: "center",
        maxWidth: pageWidth - 40,
      });
      y += 18;
    }
    // Space between description and dates
    y += 2;
    // Date range
    if (vote.startTime && vote.endTime) {
      const start = moment
        .tz(vote.startTime.seconds * 1000, "Europe/Berlin")
        .format("DD.MM.YYYY HH:mm");
      const end = moment
        .tz(vote.endTime.seconds * 1000, "Europe/Berlin")
        .format("DD.MM.YYYY HH:mm");
      doc.setFontSize(16);
      doc.setTextColor(60, 60, 60);
      doc.text(`Abgabe: ${start} bis ${end}`, pageWidth / 2, y, {
        align: "center",
      });
      y += 16;
    }
    // QR code
    const qrSvg = document.getElementById("qr-svg");
    if (qrSvg) {
      try {
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(qrSvg);
        const canvas = document.createElement("canvas");
        // Big QR code
        const qrSize = 80; // mm
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas konnte nicht erstellt werden.");
        const canvgInstance = await Canvg.fromString(ctx, svgString);
        await canvgInstance.render();
        const imgData = canvas.toDataURL("image/png");
        // Center QR code
        doc.addImage(
          imgData,
          "PNG",
          (pageWidth - qrSize) / 2,
          y,
          qrSize,
          qrSize
        );
        y += qrSize + 6; // Less space under QR
        // Link under QR code
        doc.setFontSize(16);
        doc.setTextColor(80, 80, 80);
        doc.text(url, pageWidth / 2, y, {
          align: "center",
          maxWidth: pageWidth - 40,
        });
        y += 10; // Less space under link
        // Gray info text
        doc.setFontSize(14);
        doc.setTextColor(150, 150, 150);
        doc.text("Scannen zum Teilnehmen an der Wahl", pageWidth / 2, y, {
          align: "center",
        });
        // Footer
        const footerY = doc.internal.pageSize.getHeight() - 18;
        doc.setFontSize(11);
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
  };

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: 24 }}>
      <h2 style={{ textAlign: "center" }}>{vote.title || "Wahl teilen"}</h2>
      {vote.description && (
        <p style={{ textAlign: "center", color: "#555" }}>{vote.description}</p>
      )}
      {vote.startTime && vote.endTime && (
        <p style={{ textAlign: "center", fontSize: 14 }}>
          Abgabe vom:{" "}
          <b>
            {moment
              .tz(vote.startTime.seconds * 1000, "Europe/Berlin")
              .format("DD.MM.YYYY HH:mm")}
          </b>{" "}
          bis{" "}
          <b>
            {moment
              .tz(vote.endTime.seconds * 1000, "Europe/Berlin")
              .format("DD.MM.YYYY HH:mm")}
          </b>
        </p>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div style={{ background: "white", padding: 16, borderRadius: 8 }}>
          <QRCode id="qr-svg" value={url} size={180} />
        </div>
        <div style={{ width: "100%", marginTop: 8 }}>
          <mdui-text-field
            label="Wahl-Link"
            value={url}
            readonly
            style={{ width: "100%" }}
          >
            <mdui-button-icon
              slot="end-icon"
              icon="content_copy"
              onClick={() => {
                navigator.clipboard.writeText(url).then(() => {
                  snackbar({ message: "Link kopiert" });
                });
              }}
            />
          </mdui-text-field>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 12,
          }}
        >
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
        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
          <mdui-button
            icon="download"
            onClick={async () => {
              const qrSvg = document.getElementById("qr-svg");
              if (!qrSvg) {
                snackbar({ message: "QR-Code nicht gefunden." });
                return;
              }
              try {
                const serializer = new XMLSerializer();
                const svgString = serializer.serializeToString(qrSvg);
                const canvas = document.createElement("canvas");
                // Set canvas size to SVG size
                const bbox = qrSvg.getBoundingClientRect();
                canvas.width = bbox.width || 180;
                canvas.height = bbox.height || 180;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                  snackbar({ message: "Canvas konnte nicht erstellt werden." });
                  return;
                }
                // Use canvg to render SVG to canvas
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
            }}
          >
            QR-Code als PNG
          </mdui-button>
          <mdui-button icon="picture_as_pdf" onClick={handleExportPDF}>
            PDF exportieren
          </mdui-button>
          <mdui-button
            icon="share"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: "Wahl", text: url });
              } else {
                navigator.clipboard.writeText(url).then(() => {
                  snackbar({
                    message: "Link kopiert (Teilen nicht unterstützt)",
                  });
                });
              }
            }}
          >
            Teilen
          </mdui-button>
        </div>
      </div>
    </div>
  );
}

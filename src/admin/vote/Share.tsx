import React from "react";
import QRCode from "react-qr-code";
import { useParams } from "react-router-dom";

interface ShareProps {}

export default function Share({}: ShareProps) {
  const { id } = useParams<{ id: string }>();
  const [settings, setSettings] = React.useState<boolean>(false);
  const [allowResubmission, setAllowResubmission] =
    React.useState<boolean>(false);

  const switchRef = React.useRef<HTMLInputElement>(null);
  const qrCodeRef = React.useRef<any>(null);

  React.useEffect(() => {
    const handleToggle = () => {
      if (switchRef.current) {
        setAllowResubmission(switchRef.current.checked);
      }
    };

    if (switchRef.current) {
      switchRef.current.addEventListener("change", handleToggle);
    }

    return () => {
      if (switchRef.current) {
        switchRef.current.removeEventListener("change", handleToggle);
      }
    };
  }, []);

  return (
    <div>
      <mdui-dialog
        id="dialog"
        open={settings}
        headline="Einstellungen"
        icon="settings"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <mdui-switch ref={switchRef} />
          <label>Nutzern erlauben, mehrfach eine Wahl abzugeben</label>
        </div>
        <p />
        <mdui-button
          onClick={() => {
            setSettings(false);
          }}
        >
          Schließen
        </mdui-button>
      </mdui-dialog>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "16px",
            width: "fit-content",
          }}
        >
          <QRCode
            ref={qrCodeRef}
            value={
              allowResubmission
                ? `https://waldorfwahlen.web.app/v/${id}?allowResubmission=true`
                : `https://waldorfwahlen.web.app/${id}`
            }
          />
        </div>
        <p />
        <mdui-segmented-button-group>
          <mdui-segmented-button
            icon="download"
            onClick={() => {
              const qrCodeElement = qrCodeRef.current?.querySelector("svg");
              if (!qrCodeElement) return;
              const serializer = new XMLSerializer();
              const svgString = serializer.serializeToString(qrCodeElement);
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");
              if (!ctx) return;
              const svg = new Blob([svgString], { type: "image/svg+xml" });
              const url = URL.createObjectURL(svg);
              const img = new Image();
              img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);
                canvas.toBlob((blob) => {
                  if (!blob) return;
                  const link = document.createElement("a");
                  link.href = URL.createObjectURL(blob);
                  link.download = "qrcode.png";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }, "image/png");
              };
              img.src = url;
            }}
          ></mdui-segmented-button>
          <mdui-segmented-button
            icon="share"
            onClick={() =>
              navigator.share({
                title: "Wahl",
                text: allowResubmission
                  ? `https://waldorfwahlen.web.app/v/${id}?allowResubmission=true`
                  : `https://waldorfwahlen.web.app/${id}`,
              })
            }
          ></mdui-segmented-button>
          <mdui-segmented-button
            icon="content_copy"
            onClick={() =>
              navigator.clipboard.writeText(
                allowResubmission
                  ? `https://waldorfwahlen.web.app/v/${id}?allowResubmission=true`
                  : `https://waldorfwahlen.web.app/${id}`
              )
            }
          ></mdui-segmented-button>
          <mdui-segmented-button
            icon="settings"
            onClick={() => {
              setSettings(true);
            }}
          ></mdui-segmented-button>
        </mdui-segmented-button-group>
      </div>
    </div>
  );
}

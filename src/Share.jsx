import { useRef } from "react";
import QRCode from "react-qr-code";
import { useParams } from "react-router-dom";

export default function Share() {
  const { id } = useParams();

  const qrCodeRef = useRef(null); // Referenz zum QR-Code-Element

  return (
    <>
      <h1>Erfolgreich erstellt!</h1>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div
          style={{
            background: "white",
            padding: "16px",
            width: "fit-content",
          }}
        >
          <QRCode
            ref={qrCodeRef}
            value={`https://waldorfwahlen.web.app/v/${id}`}
          />
        </div>
      </div>
      <a href={`https://waldorfwahlen.web.app/v/${id}`}>
        waldorfwahlen.web.app/v/{id}
      </a>
      <p />
      <b>Deaktivierter Schutzmechanismus von Mehrfachwahlen</b>
      <br />
      <a href={`https://waldorfwahlen.web.app/v/${id}?allowResubmission=true`}>
        waldorfwahlen.web.app/v/{id}?allowResubmission=true
      </a>
    </>
  );
}

import { useRouteError } from "react-router-dom";
import "./error.css";

export default function ErrorPage() {
  let error = useRouteError();
  document.title = "Oops! " + (error?.status || "Unknown Error");

  console.error(error);
  return (
    <div className="error-container">
      <div className="error-content">
        <div className="error-message">
          <h2>
            Fehler{" "}
            <span style={{ fontFamily: "monospace", fontSize: "70px" }}>
              {error.status}
            </span>
          </h2>
          <b>{error.statusText || "Unbekannter Fehler"}</b>
          <p>
            Leider ist ein unerwarteter Fehler aufgetreten.{" "}
            {error.status >= 400 && error.status < 500
              ? "Es scheint, dass der Fehler auf Ihrer Seite liegt."
              : "Wir arbeiten daran, das Problem zu beheben."}
          </p>
          <div className="error-button" onClick={() => window.history.back()}>
            Zurück
          </div>
        </div>
        <div className="error-details">
          <p>
            Wenn Sie möchten, können Sie helfen, den Fehler zu beheben, indem
            Sie die folgenden Informationen per Mail weiterleiten:
          </p>
          <div className="error-stacktrace">
            {JSON.stringify(error, null, 2)}
          </div>
        </div>
      </div>
    </div>
  );
}

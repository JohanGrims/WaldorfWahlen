import { useRouteError } from "react-router-dom";

export default function ErrorPage() {
  let error = useRouteError();
  document.title = "Oops! " + (error?.status || "Unknown Error");

  console.error(error);
  return (
    <mdui-dialog open headline={`Fehler ${error?.status || "400"}`}>
      <div className="mdui-prose">
        <p>{error?.statusText || error?.data || "Unknown Error Message"}</p>
        <p>
          {error.status >= 400 && error.status < 500
            ? "Es scheint, dass der Fehler auf Ihrer Seite liegt."
            : "Wir arbeiten daran, das Problem zu beheben."}
        </p>
      </div>
      <p />
      <div className="button-container">
        <mdui-button onClick={() => window.history.back()} variant="text">
          Zurück
        </mdui-button>
        <mdui-button onClick={() => window.location.reload()}>
          Neu laden
        </mdui-button>
      </div>
    </mdui-dialog>
  );
}

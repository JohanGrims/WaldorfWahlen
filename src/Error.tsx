import { useRouteError, isRouteErrorResponse } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError();

  console.error(error);

  let errorMessage: string;

  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText || String(error.data || 'Route error');
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else {
    errorMessage = "Unknown error";
  }

  return (
    <mdui-dialog
      open
      headline={`Fehler ${isRouteErrorResponse(error) ? error.status : "400"}`}
      icon="error"
    >
      <div className="mdui-prose">
        <p>{errorMessage}</p>
        <p>
          {isRouteErrorResponse(error) && error.status >= 400 && error.status < 500
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

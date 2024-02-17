import { useRouteError } from "react-router-dom";

export default function ErrorPage() {
  let error = useRouteError();
  return (
    <>
      <a href="/">Startseite</a>

      <h1>Es ist ein Fehler aufgetreten...</h1>

      <h2>{error.status}</h2>
      <b>{error.statusText}</b>
      <p />
      <p />
      {error.data}
      <p />
    </>
  );
}

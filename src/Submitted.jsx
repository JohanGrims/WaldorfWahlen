import { useNavigate, useParams } from "react-router-dom";

export default function Submitted() {
  const { id } = useParams();
  const urlParams = new URLSearchParams(window.location.search);

  const navigate = useNavigate();

  return (
    <mdui-dialog open headline="Vielen Dank!">
      <div className="mdui-prose">
        <p>
          Deine Wahl wurde erfolgreich abgegeben. Bei Fragen oder Problemen
          melden Sie sich beim betreuenden Lehrer der Wahl oder den
          SV-Vertretern Deiner Klasse.
        </p>
        <p />
        <div className="button-container">
          {urlParams.get("allowResubmission") ? (
            <mdui-button
              onClick={() => {
                localStorage.removeItem(id);
                navigate(`/v/${id}?allowResubmission=true`);
              }}
            >
              Erneut wählen
            </mdui-button>
          ) : (
            <mdui-button onClick={() => navigate(`/`)}>Startseite</mdui-button>
          )}
          <mdui-button disabled variant="text">
            {JSON.parse(localStorage.getItem(id))?.choiceId}
          </mdui-button>
        </div>
      </div>
    </mdui-dialog>
  );
}

import { useNavigate, useParams } from "react-router-dom";

interface LocalStorageData {
  choiceId: string;
}

export default function Submitted() {
  const { id } = useParams<{ id: string }>();
  const urlParams = new URLSearchParams(window.location.search);

  const navigate = useNavigate();

  const localStorageData: LocalStorageData | null = id ? JSON.parse(localStorage.getItem(id) || "null") : null;

  return (
    <mdui-dialog open headline="Vielen Dank!" icon="done">
      <div className="mdui-prose">
        <p>
          Ihre Wahl wurde erfolgreich abgegeben. Bei Fragen oder Problemen
          melden Sie sich beim betreuenden Lehrer der Wahl oder den
          SV-Vertretern Ihrer Klasse.
        </p>
        <p />
        <div className="button-container">
          {urlParams.get("allowResubmission") ? (
            <mdui-button
              onClick={() => {
                if (id) localStorage.removeItem(id);
                navigate(`/v/${id}?allowResubmission=true`);
              }}
            >
              Erneut wählen
            </mdui-button>
          ) : (
            <mdui-button onClick={() => navigate(`/`)}>Startseite</mdui-button>
          )}
          {localStorageData?.choiceId && (
            <mdui-button disabled variant="text">
              {localStorageData.choiceId}
            </mdui-button>
          )}
        </div>
      </div>
    </mdui-dialog>
  );
}

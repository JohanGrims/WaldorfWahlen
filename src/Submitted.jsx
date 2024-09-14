import { useNavigate, useParams } from "react-router-dom";
import "./submitted.css";

export default function Submitted() {
  const { id } = useParams();
  const urlParams = new URLSearchParams(window.location.search);

  const navigate = useNavigate();

  return (
    <div className="submitted-container">
      <div className="submitted-content">
        <div className="submitted-message">
          <h2>Vielen Dank!</h2>
          <p>
            Deine Wahl wurde erfolgreich abgegeben. Bei Fragen oder Problemen
            melde Dich beim betreuenden Lehrer der Wahl oder den SV-Vertretern
            Deiner Klasse.
          </p>
          {urlParams.get("allowResubmission") && (
            <button
              className="button"
              onClick={() => {
                localStorage.removeItem(id);
                navigate(`/v/${id}?allowResubmission=true`);
              }}
            >
              Erneut wählen
            </button>
          )}
        </div>

        <div className="submitted-details">
          <img className="submitted-image" src="/WSP.png" />
        </div>
      </div>
    </div>
  );
}

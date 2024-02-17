import { useNavigate, useParams } from "react-router-dom";

export default function Submitted() {
  const { id } = useParams();
  const urlParams = new URLSearchParams(window.location.search);

  const navigate = useNavigate();

  if (urlParams.get("allowResubmission")) {
    return (
      <div>
        Erfolgreich abgegeben. <p />
        <button
          className="button"
          onClick={() => {
            localStorage.removeItem(id);
            navigate(`/v/${id}?allowResubmission=true`);
          }}
        >
          Erneut wählen
        </button>
      </div>
    );
  }
  return <div>Erfolgreich abgegeben.</div>;
}

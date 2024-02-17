import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore/lite";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "./firebase";

export default function Vote() {
  const urlParams = new URLSearchParams(window.location.search);

  let { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = React.useState();
  const [options, setOptions] = React.useState([]);
  const [name, setName] = React.useState();
  const [grade, setGrade] = React.useState();
  const [selected, setSelected] = React.useState([]);
  const [selectCount, setSelectCount] = React.useState();
  const [loading, setLoading] = React.useState(true);
  const [active, setActive] = React.useState();
  const [extraFields, setExtraFields] = React.useState([]);
  const [extraFieldsValues, setExtraFieldsValues] = React.useState([]);

  React.useEffect(() => {
    if (localStorage.getItem(id)) {
      if (urlParams.get("allowResubmission")) {
        navigate(`/submitted/${id}?allowResubmission=true`);
        return;
      }
      navigate(`/submitted/${id}`);
    }
    getDocs(collection(db, `/votes/${id}/options`)).then((e) => {
      e.docs.map((e) =>
        setOptions((options) => [...options, { id: e.id, ...e.data() }])
      );
      getDoc(doc(db, `/votes/${id}`)).then((e) => {
        let data = e.data();
        if (data === undefined) {
          alert("Document not found.");
          navigate("/");
        }
        setTitle(data.title);
        setSelectCount(data.selectCount);
        setSelected(Array.from({ length: data.selectCount }, () => "null"));
        setActive(data.active);
        if (data.extraFields) {
          setExtraFields(data.extraFields);

          setExtraFieldsValues(Array(data.extraFields.length).fill(""));
        }
        setLoading(false);
      });
    });
  }, []);

  const select = (index, newValue) => {
    const newArray = [...selected];
    newArray[index] = newValue;
    setSelected(newArray);
  };

  function submit() {
    setLoading(true);
    addDoc(collection(db, `/votes/${id}/choices`), {
      name: name,
      grade: grade,
      selected: selected,
      extraFields: extraFieldsValues,
    })
      .then((e) => {
        localStorage.setItem(id, true);
        if (urlParams.get("allowResubmission")) {
          navigate(`/submitted/${id}?allowResubmission=true`);
          return;
        }
        navigate(`/submitted/${id}`);
      })
      .catch((error) => {
        alert(error);
      });
  }

  const handleInputChange = (index, value) => {
    const newValues = [...extraFieldsValues];
    newValues[index] = value;
    setExtraFieldsValues(newValues);
  };

  if (active === false) {
    navigate(`/r/${id}`);
  }
  return (
    <>
      {!loading && (
        <div style={{ padding: "10px" }}>
          <h1>{title}</h1>
          <h3>Name</h3>
          {/* <i>
            Aus Datenschutzgründen gib bitte nur den Vornamen und den ersten
            Buchstaben des Nachnamens ein.
          </i> */}
          <p />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="button"
            placeholder="Max M."
          />
          <p />
          <h3>Klasse</h3>
          <input
            type="number"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="button"
            placeholder="11"
          />
          <p />
          <br />
          {extraFields.length > 0 && <h3>Weitere Felder</h3>}
          {extraFields.map((e, i) => (
            <>
              <input
                value={extraFieldsValues[i]}
                onChange={(e) => handleInputChange(i, e.target.value)}
                className="button"
                placeholder={e}
              />
              <p />
            </>
          ))}
          <br />
          <p />
          {Array.from({ length: selectCount }).map((e, index) => (
            <>
              <h3>{index + 1}. Wahl</h3>
              {options.map((e) => (
                <>
                  <div
                    className={`button ${
                      selected[index] === e.id
                        ? "active"
                        : selected.includes(e.id) && "disabled"
                    }`}
                    onClick={() => {
                      selected[index] === e.id
                        ? select(index, null)
                        : !selected.includes(e.id) && select(index, e.id);
                    }}
                  >
                    <h2>
                      {e.title}
                      <br />
                      <i>{e.teacher}</i>
                    </h2>
                    <br />
                    {e.description}
                    <br />
                    <i>max. {e.max} Schüler</i>
                  </div>
                  <br />
                </>
              ))}
            </>
          ))}
          <p />
          <p />
          <button
            className={`button ${
              selected.includes("null") ||
              !name ||
              !grade ||
              name?.length < 2 ||
              grade?.length < 1 ||
              extraFieldsValues.length !== extraFields.length ||
              extraFieldsValues.some(
                (value) => !value || !/[a-zA-Z]/.test(value)
              )
                ? "disabled"
                : undefined
            }`}
            disabled={
              selected.includes("null") ||
              !name ||
              !grade ||
              name?.length < 2 ||
              grade?.length < 1 ||
              extraFieldsValues.length !== extraFields.length ||
              extraFieldsValues.some(
                (value) => !value || !/[a-zA-Z]/.test(value)
              )
            }
            onClick={
              selected.includes("null") ||
              !name ||
              !grade ||
              name?.length < 2 ||
              grade?.length < 1 ||
              extraFieldsValues.length !== extraFields.length ||
              extraFieldsValues.some(
                (value) => !value || !/[a-zA-Z]/.test(value)
              )
                ? null
                : submit
            }
          >
            Absenden
          </button>
        </div>
      )}
    </>
  );
}

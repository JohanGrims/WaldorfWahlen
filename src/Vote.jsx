import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore/lite";
import React, { useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "./firebase";

export default function Vote() {
  const urlParams = new URLSearchParams(window.location.search);

  const refs = useRef([]);

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
    setLoading(true);
    setTitle("");
    setOptions([]);
    setName("");
    setGrade("");
    setSelected("");
    setSelectCount("");
    setActive("");
    setExtraFields([]);
    setExtraFieldsValues([]);
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
    if (newValue && refs.current[index + 1]) {
      refs.current[index + 1].scrollIntoView();
    }
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
  if (loading) {
    return null;
  }
  return (
    <div className="vote">
      {!loading && (
        <div style={{ padding: "10px" }}>
          <h1>{title}</h1>
          <span className="label">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Max M."
          />
          <p />
          <span className="label">Klasse</span>
          <input
            min={1}
            max={13}
            type="number"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="11"
          />
          <p />
          <br />
          {extraFields.map((e, i) => (
            <>
              <input
                value={extraFieldsValues[i]}
                onChange={(e) => handleInputChange(i, e.target.value)}
                placeholder={e}
              />
              <p />
            </>
          ))}
          {Array.from({ length: selectCount }).map((e, index) => (
            <>
              <h2 ref={(el) => (refs.current[index] = el)}>
                {index + 1}. Wahl
              </h2>
              <div className="options">
                {options.map((e) => (
                  <>
                    <div
                      className={`option ${
                        selected[index] === e.id
                          ? "active"
                          : selected.includes(e.id) && "disabled"
                      }`}
                      onClick={() => {
                        selected[index] === e.id
                          ? select(index, "null")
                          : !selected.includes(e.id) && select(index, e.id);
                      }}
                    >
                      <div className="title">{e.title}</div>
                      <div className="teacher">{e.teacher}</div>
                      <div className="description">{e.description}</div>
                      <div className="max">max. {e.max} SchülerInnen</div>
                    </div>
                    <br />
                  </>
                ))}
              </div>
            </>
          ))}
          <p />
          <p />
          <button
            ref={(el) => (refs.current[selectCount] = el)}
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
          {JSON.stringify(selected)}
        </div>
      )}
    </div>
  );
}

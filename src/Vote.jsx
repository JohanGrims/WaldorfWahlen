import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore/lite";
import React, { useRef } from "react";
import { useLoaderData, useNavigate, useParams } from "react-router-dom";
import { db } from "./firebase";

export default function Vote() {
  const refs = useRef([]);
  const urlParams = new URLSearchParams(window.location.search);
  let { id } = useParams();
  const { voteData, optionsData } = useLoaderData();

  const navigate = useNavigate();

  const [title, setTitle] = React.useState(voteData.title);
  const [selectCount, setSelectCount] = React.useState(voteData.selectCount);
  const [extraFields, setExtraFields] = React.useState(voteData.extraFields);
  const [active, setActive] = React.useState(voteData.active);

  const [options, setOptions] = React.useState(optionsData);

  const [firstName, setFirstName] = React.useState();
  const [lastName, setLastName] = React.useState();
  const [grade, setGrade] = React.useState();
  const [listIndex, setListIndex] = React.useState();
  const [selected, setSelected] = React.useState(
    Array.from({ length: voteData.selectCount }, () => "null")
  );
  const [extraFieldsValues, setExtraFieldsValues] = React.useState([]);

  React.useEffect(() => {
    document.title = title;

    if (localStorage.getItem(id)) {
      if (urlParams.get("allowResubmission")) {
        navigate(`/submitted/${id}?allowResubmission=true`);
        window.location.href = `/submitted/${id}?allowResubmission=true`;
        return;
      }
      navigate(`/submitted/${id}`);
      window.location.href = `/submitted/${id}`;
    }
  }, []);

  const submitDisabled = () => {
    if (
      selected.includes("null") ||
      !firstName?.trim() ||
      !lastName?.trim() ||
      !grade ||
      !listIndex ||
      firstName.length < 2 ||
      lastName.length < 2 ||
      extraFieldsValues.length !== extraFields.length ||
      extraFieldsValues.some((value) => !value?.trim())
    ) {
      return true;
    }

    return false;
  };

  const select = (index, newValue) => {
    const newArray = [...selected];
    newArray[index] = newValue;
    setSelected(newArray);
    if (newValue && refs.current[index + 1] && newValue !== "null") {
      refs.current[index + 1].scrollIntoView();
    }
  };

  function submit() {
    addDoc(collection(db, `/votes/${id}/choices`), {
      firstName,
      lastName,
      grade,
      listIndex,
      selected,
      extraFields: extraFieldsValues,
      version: 2,
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

  const capitalizeWords = (str) => {
    return str
      .replace(/[^a-zA-Z\s-]/g, "") // Remove non-alphabetic characters except hyphens
      .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize words
  };

  return (
    <div className="vote">
      <div style={{ padding: "10px" }}>
        <h1>{title}</h1>

        <div className="flex-row">
          <div className="column">
            <span className="label">Vorname(n)</span>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(capitalizeWords(e.target.value))}
              placeholder="Max Erika"
            />
          </div>
          <div className="column">
            <span className="label">Nachname</span>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(capitalizeWords(e.target.value))}
              placeholder="Mustermann"
            />
          </div>
        </div>
        <p />
        <div className="flex-row">
          <div className="column">
            <span className="label">Klasse</span>
            <input
              min={1}
              max={13}
              type="number"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="11"
              className="grade"
            />
          </div>
          <div className="column">
            <span className="label">Klassenlistennr.</span>
            <input
              min={1}
              max={100}
              type="number"
              value={listIndex}
              onChange={(e) => setListIndex(e.target.value)}
              placeholder="17"
            />
          </div>
        </div>
        <br />
        <div className="divider">
          <hr />
        </div>
        {extraFields.map((e, i) => (
          <div key={i}>
            <p />
            <input
              value={extraFieldsValues[i]}
              onChange={(e) =>
                handleInputChange(i, capitalizeWords(e.target.value))
              }
              placeholder={e}
            />
            <p />
          </div>
        ))}
        {Array.from({ length: selectCount }).map((e, index) => (
          <div key={index}>
            <h2 ref={(el) => (refs.current[index] = el)}>{index + 1}. Wahl</h2>
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
          </div>
        ))}
        <p />
        <p />
        <button
          ref={(el) => (refs.current[selectCount] = el)}
          disabled={submitDisabled()}
          onClick={submitDisabled() ? null : submit}
        >
          Absenden
        </button>
      </div>
    </div>
  );
}

export async function loader({ params }) {
  const vote = await getDoc(doc(db, `/votes/${params.id}`));
  if (!vote.exists()) {
    throw new Response("Document not found.", {
      status: 404,
      statusText: "Nicht gefunden",
    });
  }
  const options = await getDocs(collection(db, `/votes/${params.id}/options`));
  const voteData = vote.data();
  const optionsData = options.docs.map((e) => ({ id: e.id, ...e.data() }));

  return { voteData: voteData, optionsData: optionsData };
}

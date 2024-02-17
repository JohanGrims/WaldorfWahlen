import { addDoc, collection, doc, setDoc } from "firebase/firestore/lite";
import React from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";

export default function NewVote() {
  const [title, setTitle] = React.useState("");
  const [selectCount, setSelectCount] = React.useState();

  const [options, setOptions] = React.useState([]);
  const [name, setName] = React.useState("");
  const [teacher, setTeacher] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [max, setMax] = React.useState();

  const [extraFields, setExtraFields] = React.useState([]);

  const navigate = useNavigate();

  function generateRandomHash() {
    let hash = "";
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < 4; i++) {
      hash += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return hash;
  }

  const addOption = () => {
    setOptions((options) => [
      ...options,
      {
        title: name,
        teacher: teacher,
        description: description,
        max: max,
      },
    ]);
    setName("");
    setTeacher("");
    setDescription("");
    setMax("");
  };

  const publish = () => {
    let id = generateRandomHash();
    setDoc(doc(db, `/votes`, id), {
      title: title,
      selectCount: selectCount,
      active: true,
      extraFields: extraFields,
    }).then((e) => {
      options.map((e, index) => {
        addDoc(collection(db, `/votes/${id}/options`), {
          title: e.title,
          teacher: e.teacher,
          description: e.description,
          max: e.max,
        }).then((e) => {
          if (index + 1 === options.length) {
            setTitle("");
            setSelectCount("");
            setName("");
            setTeacher("");
            setDescription("");
            setMax("");
            setOptions([]);
            setExtraFields([]);
            navigate(`/share/${id}`);
          }
        });
      });
    });
  };

  const handleInputChange = (index, value) => {
    const newValues = [...extraFields];
    newValues[index] = value;
    setExtraFields(newValues);
  };

  const removeItem = (idx) =>
    setExtraFields(extraFields.filter((item, index) => index !== idx));

  return (
    <div style={{ width: "40vw" }}>
      <h2>Neue Umfrage</h2>
      <input
        className="button"
        placeholder="Titel der Umfrage"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <p />
      <input
        className="button"
        placeholder="Anzahl der Wahlen"
        type="number"
        value={selectCount}
        onChange={(e) => setSelectCount(e.target.value)}
      />
      <p />
      {extraFields.map((e, i) => (
        <>
          <input
            className="button"
            value={e}
            style={{ width: "140px" }}
            onChange={(e) => handleInputChange(i, e.target.value)}
            placeholder="Extrafeld"
          />
          <button
            style={{ marginLeft: "4px" }}
            onClick={() => removeItem(i)}
            className="button"
          >
            ×
          </button>
          <p />
        </>
      ))}
      <button
        className="button"
        onClick={() => setExtraFields((extraFields) => [...extraFields, ""])}
      >
        Feld hinzufügen
      </button>
      <h2>Optionen</h2>
      {/*map the options*/}

      {options.map((e) => (
        <>
          <div className="button">
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
      <div className="button active">
        <h3>Neu</h3>
        <input
          className="button"
          placeholder="Titel"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <p />
        <input
          className="button"
          placeholder="Maximalanzahl"
          type="number"
          value={max}
          onChange={(e) => setMax(e.target.value)}
        />
        <p />
        <input
          className="button"
          placeholder="Lehrer (optional)"
          value={teacher}
          onChange={(e) => setTeacher(e.target.value)}
        />
        <p />
        <input
          className="button"
          placeholder="Beschreibung (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <p />
        <button
          className={`button ${(!name || !max) && "disabled"}`}
          disabled={
            !name ||
            // teacher.length < 2 ||
            // description.length < 2 ||
            !max
          }
          onClick={addOption}
        >
          Hinzufügen
        </button>
      </div>
      <p />
      <br />
      <p />
      <button
        className={`button ${
          (title.length < 2 ||
            options.length < 1 ||
            !selectCount ||
            extraFields.some((value) => !value || !/[a-zA-Z]/.test(value))) &&
          "disabled"
        }`}
        disabled={
          title.length < 2 ||
          options.length < 1 ||
          !selectCount ||
          extraFields.some((value) => !value || !/[a-zA-Z]/.test(value))
        }
        onClick={publish}
      >
        Veröffentlichen
      </button>
    </div>
  );
}

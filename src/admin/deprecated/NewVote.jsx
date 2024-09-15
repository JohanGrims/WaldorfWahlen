import {
  addDoc,
  collection,
  doc,
  setDoc,
  Timestamp,
} from "firebase/firestore/lite";
import React from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";

export default function NewVote() {
  const [title, setTitle] = React.useState("");
  const [selectCount, setSelectCount] = React.useState();

  const [options, setOptions] = React.useState([]);
  const [name, setName] = React.useState("");
  const [teacher, setTeacher] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [max, setMax] = React.useState();
  const [endTime, setEndTime] = React.useState();

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
      endTime: Timestamp.fromDate(new Date(endTime)),
      version: 2,
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
    <div style={{ width: "100%" }}>
      <h2>Neue Wahl</h2>
      <input
        className="button"
        placeholder="Titel der Wahl"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <span className="text-info">{title.length} / 20</span>
      <p />
      <input
        className="button"
        placeholder="Anzahl der Wahlen"
        type="number"
        min={1}
        max={10}
        value={selectCount}
        onChange={(e) => setSelectCount(e.target.value)}
      />
      <p />
      <input
        className="button"
        type="datetime-local"
        value={endTime}
        onChange={(e) => setEndTime(e.target.value)}
      />
      <p />
      {extraFields.map((e, i) => (
        <div className="extrafield" key={i}>
          <input
            value={e}
            onChange={(e) => handleInputChange(i, e.target.value)}
            placeholder="z.B. Musikinstrument"
          />
          <button
            style={{ marginLeft: "4px" }}
            onClick={() => removeItem(i)}
            className="delete-button"
          >
            ×
          </button>

          <p />
        </div>
      ))}
      <button
        className="button"
        onClick={() => setExtraFields((extraFields) => [...extraFields, ""])}
      >
        Feld hinzufügen
      </button>
      <h2>Wahlmöglichkeiten</h2>
      {/*map the options*/}

      {options.map((e, index) => (
        <div key={index}>
          <div className={`option disabled`}>
            <div className="title">{e.title}</div>
            <div className="teacher">{e.teacher}</div>
            <div className="description">{e.description}</div>
            <div className="max">max. {e.max} SchülerInnen</div>
          </div>
          <br />
        </div>
      ))}
      <div className="option active nohover">
        <h3>Neu</h3>
        <input
          className="button"
          placeholder="Titel"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <span className="text-info">{name.length} / 20</span>
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
        <span className="text-info">{teacher.length} / 20</span>
        <p />
        <input
          className="button"
          placeholder="Beschreibung (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <span className="text-info">{description.length} / 100</span>
        <p />
        <button
          className={`button ${(!name || !max) && "disabled"}`}
          disabled={!name || !max}
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
            !endTime ||
            !selectCount ||
            extraFields.some((value) => !value || !/[a-zA-Z]/.test(value))) &&
          "disabled"
        }`}
        disabled={
          title.length < 2 ||
          options.length < 1 ||
          !endTime ||
          !selectCount ||
          extraFields.some((value) => !value || !/[a-zA-Z]/.test(value))
        }
        onClick={publish}
      >
        Veröffentlichen
      </button>
      <p />
    </div>
  );
}

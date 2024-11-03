import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { useLoaderData } from "react-router-dom";
import { auth, db } from "../../firebase";

export default function Results() {
  const { vote, options, results, choices } = useLoaderData();

  function printResults() {
    const printContents = document.querySelector(".print-table").outerHTML;

    // Neues iframe erstellen
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "absolute";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "none";
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow || printFrame.contentDocument;
    frameDoc.document.open();
    frameDoc.document.write(`
      <html>
        <head>
          <title>Drucken</title>
          <style>
            /* Optional: Stil-Definitionen für den Druck */
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);
    frameDoc.document.close();

    // print()-Funktion des iframe verwenden
    frameDoc.focus();
    frameDoc.print();

    // iframe nach dem Drucken entfernen
    setTimeout(() => {
      document.body.removeChild(printFrame);
    }, 1000);
  }

  function publishResults() {
    setDoc(
      doc(db, `votes/${vote.id}`),
      {
        result: true,
      },
      { merge: true }
    );
  }

  const sortedResults = () => {
    // sort by grade
    let resultsByGrade = {};
    choices.forEach((choice) => {
      if (!results.find((result) => result.id === choice.id)) {
        return;
      }
      if (!resultsByGrade[choice.grade]) {
        resultsByGrade[choice.grade] = [];
      }
      resultsByGrade[choice.grade].push({
        ...results.find((result) => result.id === choice.id),
        name: choice.name,
      });
    });
    // then sort by name
    Object.keys(resultsByGrade).forEach((grade) => {
      resultsByGrade[grade].sort((a, b) => {
        return choices
          .find((choice) => choice.id === a.id)
          .name.localeCompare(
            choices.find((choice) => choice.id === b.id).name
          );
      });
    });

    // Convert resultsByGrade object to a list
    let resultsList = [];
    Object.keys(resultsByGrade).forEach((grade) => {
      resultsByGrade[grade].forEach((result) => {
        resultsList.push({
          ...result,
          grade: grade,
        });
      });
    });
    return resultsList;
  };
  return (
    <div className="mdui-prose">
      <h2>Ergebnisse</h2>
      <div className="mdui-table" style={{ width: "100%" }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Klasse</th>
              <th>#</th>
              <th>Projekt</th>
            </tr>
          </thead>
          <tbody>
            {sortedResults().map((result) => (
              <tr key={result.id}>
                <td>
                  {choices.find((choice) => choice.id === result.id).name}
                </td>
                <td>
                  {choices.find((choice) => choice.id === result.id).grade}
                </td>
                <td>
                  {choices.find((choice) => choice.id === result.id).listIndex}
                </td>
                <td>
                  {options.find((option) => option.id === result.result).title}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="print-table">
        <h2>{vote.title}</h2>
        <table>
          <>
            <tr>
              <th>Klasse</th>
              <th>Name</th>
              <th>Projekt</th>
            </tr>
          </>
          <tbody>
            {sortedResults().map((result) => (
              <tr key={result.id}>
                <td>
                  {choices.find((choice) => choice.id === result.id).name}
                </td>
                <td>
                  {choices.find((choice) => choice.id === result.id).grade}
                </td>
                <td>
                  {options.find((option) => option.id === result.result).title}
                </td>
              </tr>
            ))}
          </tbody>
          <>
            <tr>
              <td colSpan="3">
                <i>
                  Generiert am {new Date().toLocaleDateString()} von{" "}
                  {auth.currentUser.email} mit WaldorfWahlen
                </i>
              </td>
            </tr>
          </>
        </table>
      </div>
      <div className="button-container">
        <mdui-button variant="tonal" onClick={printResults}>
          Drucken
        </mdui-button>
        <mdui-tooltip
          variant="rich"
          headline="Veröffentlichen"
          content="Bei der Veröffentlichung werden keine persönlichen Daten veröffentlicht. Deshalb ist das Ansehen nur auf dem selben Gerät möglich, auf dem die Antwort abgegeben wurde."
        >
          <mdui-button onClick={publishResults} disabled={vote.result}>
            Veröffentlichen
          </mdui-button>
        </mdui-tooltip>
      </div>
    </div>
  );
}

export async function loader({ params }) {
  const { id } = params;
  const vote = (await getDoc(doc(db, `/votes/${id}`))).data();
  const options = (
    await getDocs(collection(db, `/votes/${id}/options`))
  ).docs.map((doc) => {
    return { id: doc.id, ...doc.data() };
  });

  const results = (
    await getDocs(collection(db, `/votes/${id}/results`))
  ).docs.map((doc) => {
    return { id: doc.id, ...doc.data() };
  });

  const choices = (
    await getDocs(collection(db, `/votes/${id}/choices`))
  ).docs.map((doc) => {
    return { id: doc.id, ...doc.data() };
  });

  return {
    vote,
    options,
    results,
    choices,
  };
}

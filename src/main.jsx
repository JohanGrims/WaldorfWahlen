import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ErrorPage from "./Error";
import "./styles.css";

import "mdui";
import { alert, setColorScheme, setTheme } from "mdui";
import "mdui/mdui.css";
import { getToken } from "firebase/app-check";
import { appCheck } from "./firebase";
import ScrollToTop from "./admin/utils";

setColorScheme("#f89e24");
setTheme(localStorage.getItem("theme") || "dark");


// Redirect everything to wsp.beta.praktikum.click/original-path
if (
  window.location.hostname !== "wsp.beta.praktikum.click") {
  const newUrl = `https://wsp.beta.praktikum.click${window.location.pathname}${window.location.search}`;
  window.location.replace(newUrl);
}



// const router = createBrowserRouter(routes);

// async function verifyAppCheck() {
//   try {
//     const token = await getToken(appCheck, false);
//     if (token === null) {
//       console.error("App check token is null");
//       return showCaptcha();
//     }
//   } catch (error) {
//     console.error("Error verifying app check:", error);
//     return showCaptcha();
//   }
// }

// function showCaptcha() {
//   alert({
//     icon: "error",
//     headline: "Sicherheitsüberprüfung fehlgeschlagen",
//     description:
//       "Bitte verifizieren Sie sich als Mensch, um fortzufahren. Dies ist notwendig, um die Anwendung vor Missbrauch zu schützen.",
//     confirmText: "Verifizieren",
//     onConfirm: async () => {
//       try {
//         // reCAPTCHA Enterprise Challenge starten
//         const token = await window.grecaptcha.enterprise.execute(
//           "6LfNXNoqAAAAABF77vNghbzVpS2ROyICcK0AJ7Zb",
//           { action: "verify" }
//         );

//         console.log("reCAPTCHA Token:", token);

//         // App Check erneut abrufen
//         await getToken(appCheck, true);

//         alert({
//           icon: "check",
//           headline: "Verifizierung erfolgreich",
//           description: "Sie haben Zugriff auf die Anwendung.",
//           confirmText: "Weiter",
//         });
//       } catch (error) {
//         console.error("reCAPTCHA fehlgeschlagen:", error);
//         alert({
//           icon: "error",
//           headline: "Verifizierung fehlgeschlagen",
//           description:
//             "Bitte versuchen Sie es erneut. Falls das Problem weiterhin besteht, wenden Sie sich an den zuständigen Lehrer.",
//           confirmText: "Neu laden",
//           onConfirm: () => {
//             window.location.reload();
//           },
//         });
//       }
//     },
//   });
// }

// // reCAPTCHA Enterprise Skript laden
// const script = document.createElement("script");
// script.src =
//   "https://www.google.com/recaptcha/enterprise.js?render=6LfNXNoqAAAAABF77vNghbzVpS2ROyICcK0AJ7Zb";
// script.async = true;
// script.defer = true;

// script.onload = () => {
//   verifyAppCheck();
// };

// document.body.appendChild(script);

ReactDOM.createRoot(document.getElementById("root")).render(
  <div className="wrapper">{/* <RouterProvider router={router} /> */}</div>
);

import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import ErrorPage from "./Error.jsx";
import "./styles.css";

import AnswerList from "./admin/AnswerList.jsx";
import AssignStudents, {
  loader as assignStudentsLoader,
} from "./admin/AssignStudents.tsx";
import Admin from "./admin/index.jsx";
import App, { loader as appLoader } from "./App.jsx";
import Result from "./Result.jsx";
import Vote, { loader as voteLoader } from "./Vote.jsx";

const Share = lazy(() => import("./Share.jsx"));
const Submitted = lazy(() => import("./Submitted.jsx"));

import "mdui";
import { setColorScheme } from "mdui";
import "mdui/mdui.css";

const Loader = () => (
  <div className="loader-wrapper">
    <div className="loader"></div>
  </div>
);

setColorScheme("#f89e24");

const router = createBrowserRouter([
  {
    path: "/",
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        element: <App />,
        loader: appLoader,
      },
      {
        path: "/vote/:id",
        element: <Vote />,
        loader: voteLoader,
      },
      {
        path: "/v/:id",
        element: <Vote />,
        loader: voteLoader,
      },
      {
        path: "/results/:id",
        element: <Result />,
        loader: voteLoader,
      },
      {
        path: "/r/:id",
        element: <Result />,
        loader: voteLoader,
      },
      {
        path: "/submitted/:id",
        element: (
          <Suspense fallback={<Loader />}>
            <Submitted />
          </Suspense>
        ),
      },
      {
        path: "/admin/*",
        element: <Admin />,
        children: [
          {
            path: "",
            element: (
              <div className="mdui-prose">
                <h2>Dashboard</h2>
              </div>
            ),
          },
          {
            path: "new",
            element: (
              <div className="mdui-prose">
                <h2>Neue Umfrage</h2>
              </div>
            ),
          },
          {
            path: "settings",
            element: (
              <div className="mdui-prose">
                <h2>Einstellungen</h2>
              </div>
            ),
          },
          {
            path: "users",
            element: (
              <div className="mdui-prose">
                <h2>Administratoren</h2>
              </div>
            ),
          },
          {
            path: "o/:id",
            element: <AnswerList />,
          },
          {
            path: ":id",
            element: <AssignStudents />,
            loader: assignStudentsLoader,
          },
        ],
      },
      {
        path: "/share/:id",
        element: (
          <Suspense fallback={<Loader />}>
            <Share />
          </Suspense>
        ),
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <div className="wrapper">
    <RouterProvider router={router} />
  </div>
);

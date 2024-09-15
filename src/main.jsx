import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import ErrorPage from "./Error.jsx";
import "./styles.css";

import Admin from "./admin/index.jsx";
import App, { loader as appLoader } from "./App.jsx";
import Result from "./Result.jsx";
import Vote, { loader as voteLoader } from "./Vote.jsx";

const Submitted = lazy(() => import("./Submitted.jsx"));

import "mdui";
import { setColorScheme } from "mdui";
import "mdui/mdui.css";
import NewVote from "./admin/NewVote.jsx";
import Answers, { loader as answersLoader } from "./admin/vote/Answers.jsx";
import Delete from "./admin/vote/Delete.jsx";
import Edit from "./admin/vote/Edit.jsx";
import Schedule, { loader as scheduleLoader } from "./admin/vote/Schedule.jsx";
import Share from "./admin/vote/Share.jsx";

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
            element: <NewVote />,
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
            path: ":id/*",
            children: [
              {
                path: "",
                element: (
                  <div className="mdui-prose">
                    <h2>Wahl</h2>
                  </div>
                ),
              },
              {
                path: "edit",
                element: <Edit />,
              },
              {
                path: "answers",
                element: <Answers />,
                loader: answersLoader,
              },
              {
                path: "share",
                element: <Share />,
              },
              {
                path: "delete",
                element: <Delete />,
              },
              {
                path: "schedule",
                element: <Schedule />,
                loader: scheduleLoader,
              },
            ],
          },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <div className="wrapper">
    <RouterProvider router={router} />
  </div>
);

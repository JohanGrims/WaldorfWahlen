import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import ErrorPage from "./Error.jsx";
import "./styles.css";

import "mdui";
import { setColorScheme } from "mdui";
import "mdui/mdui.css";
import Admin from "./admin/index.jsx";
import NewVote from "./admin/NewVote.jsx";
import Settings from "./admin/Settings.jsx";
import Answers, { loader as answersLoader } from "./admin/vote/Answers.jsx";
import Assign, { loader as assignLoader } from "./admin/vote/Assign.jsx";
import Delete from "./admin/vote/Delete.jsx";
import Edit from "./admin/vote/Edit.jsx";
import Schedule, { loader as scheduleLoader } from "./admin/vote/Schedule.jsx";
import Share from "./admin/vote/Share.jsx";
import App, { loader as appLoader } from "./App.jsx";
import Gateway, { loader as gatewayLoader } from "./Gateway.jsx";
import Result from "./Result.jsx";
import Scheduled from "./Scheduled.jsx";
import Submitted from "./Submitted.jsx";
import Vote, { loader as voteLoader } from "./Vote.jsx";

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
        path: "/:id",
        element: <Gateway />,
        loader: gatewayLoader,
      },
      {
        path: "/v/:id",
        element: <Vote />,
        loader: voteLoader,
      },
      {
        path: "/r/:id",
        element: <Result />,
        loader: voteLoader,
      },
      {
        path: "/x/:id",
        element: <Submitted />,
        loader: voteLoader,
      },
      {
        path: "/s/:id",
        element: <Scheduled />,
        loader: voteLoader,
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
            element: <Settings />,
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
              {
                path: "assign",
                element: <Assign />,
                loader: assignLoader,
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

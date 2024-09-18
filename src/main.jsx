import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import ErrorPage from "./Error.jsx";
import "./styles.css";

import "mdui";
import { setColorScheme, setTheme } from "mdui";
import "mdui/mdui.css";

import App, { loader as appLoader } from "./App.jsx";
import Gateway, { loader as gatewayLoader } from "./Gateway.jsx";
import Result from "./Result.jsx";
import Scheduled from "./Scheduled.jsx";
import Submitted from "./Submitted.jsx";
import Vote, { loader as voteLoader } from "./Vote.jsx";

import Admin from "./admin/index.jsx";
import NewVote from "./admin/NewVote.jsx";
import Overview, { loader as overviewLoader } from "./admin/Overview.jsx";
import Settings from "./admin/Settings.jsx";
import Answers, { loader as answersLoader } from "./admin/vote/Answers.jsx";
import Assign, { loader as assignLoader } from "./admin/vote/Assign.jsx";
import Delete from "./admin/vote/Delete.jsx";
import Edit from "./admin/vote/Edit.jsx";
import Export from "./admin/vote/Export.jsx";
import AdminVote, { loader as adminVoteLoader } from "./admin/vote/index.jsx";
import Schedule from "./admin/vote/Schedule.jsx";
import Share from "./admin/vote/Share.jsx";

setColorScheme("#f89e24");
setTheme(localStorage.getItem("theme") || "dark");

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
            element: <Overview />,
            loader: overviewLoader,
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
                element: <AdminVote />,
                loader: adminVoteLoader,
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
                loader: adminVoteLoader,
              },
              {
                path: "schedule",
                element: <Schedule />,
                loader: adminVoteLoader,
              },
              {
                path: "assign",
                element: <Assign />,
                loader: assignLoader,
              },
              {
                path: "export",
                element: <Export />,
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

import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ErrorPage from "./Error";
import "./styles.css";

import "mdui";
import { setColorScheme, setTheme } from "mdui";
import "mdui/mdui.css";

import App, { loader as appLoader } from "./App";
import Gateway, { loader as gatewayLoader } from "./Gateway";
import Result from "./Result";
import Scheduled from "./Scheduled";
import Submitted from "./Submitted";
import Vote, { loader as voteLoader } from "./Vote";

import Admin from "./admin/index";
import NewVote from "./admin/NewVote";
import Overview, { loader as overviewLoader } from "./admin/Overview";
import Settings from "./admin/Settings";
import Students, { loader as studentsLoader } from "./admin/Students";
import Answers, { loader as answersLoader } from "./admin/vote/Answers";
import Assign, { loader as assignLoader } from "./admin/vote/Assign";
import Delete from "./admin/vote/Delete";
import Edit from "./admin/vote/Edit";
import Export from "./admin/vote/Export";
import AdminVote, { loader as adminVoteLoader } from "./admin/vote/index";
import Match, { loader as matchLoader } from "./admin/vote/Match";
import Results, { loader as resultsLoader } from "./admin/vote/Results";
import Schedule from "./admin/vote/Schedule";
import Share from "./admin/vote/Share";

setColorScheme("#f89e24");
setTheme(localStorage.getItem("theme") || "dark");

const routes = [
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
            path: "students/:classId?/:edit?",
            element: <Students />,
            loader: studentsLoader,
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
                path: "match",
                element: <Match />,
                loader: matchLoader,
              },
              {
                path: "assign",
                element: <Assign />,
                loader: assignLoader,
              },
              {
                path: "export",
                element: <Export />,
                loader: adminVoteLoader,
              },
              {
                path: "results",
                element: <Results />,
                loader: resultsLoader,
              },
            ],
          },
        ],
      },
    ],
  },
];

const router = createBrowserRouter(routes);

ReactDOM.createRoot(document.getElementById("root")).render(
  <div className="wrapper">
    <RouterProvider router={router} />
  </div>
);

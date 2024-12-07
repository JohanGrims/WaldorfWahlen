import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ErrorPage from "./Error";
import "./styles.css";

import "mdui";
import { setColorScheme, setTheme } from "mdui";
import "mdui/mdui.css";

import App from "./App";
import Gateway from "./Gateway";
import Result from "./Result";
import Scheduled from "./Scheduled";
import Submitted from "./Submitted";
import Vote from "./Vote";

import CreateReleaseNotes from "./admin/CreateReleaseNotes";
import Help from "./admin/Help";
import Admin from "./admin/index";
import NewVote from "./admin/NewVote";
import Overview from "./admin/Overview";
import ReleaseNotes from "./admin/ReleaseNotes";
import Settings from "./admin/Settings";
import Students from "./admin/Students";
import Answers from "./admin/vote/Answers";
import Assign from "./admin/vote/Assign";
import Delete from "./admin/vote/Delete";
import Edit from "./admin/vote/Edit";
import Export from "./admin/vote/Export";
import AdminVote from "./admin/vote/index";
import Match from "./admin/vote/Match";
import Results from "./admin/vote/Results";
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
        loader: App.loader,
      },
      {
        path: "/:id",
        element: <Gateway />,
        loader: Gateway.loader,
      },
      {
        path: "/v/:id",
        element: <Vote />,
        loader: Vote.loader,
      },
      {
        path: "/r/:id",
        element: <Result />,
        loader: Vote.loader,
      },
      {
        path: "/x/:id",
        element: <Submitted />,
        loader: Vote.loader,
      },
      {
        path: "/s/:id",
        element: <Scheduled />,
        loader: Vote.loader,
      },
      {
        path: "/admin/*",
        element: <Admin />,
        children: [
          {
            path: "",
            element: <Overview />,
            loader: Overview.loader,
          },
          {
            path: "new",
            element: <NewVote />,
          },
          {
            path: "students/:classId/:edit?",
            element: <Students />,
            loader: Students.loader,
          },
          {
            path: "settings",
            element: <Settings />,
          },
          {
            path: "help",
            element: <Help />,
            loader: Help.loader,
          },
          {
            path: "changelog",
            element: <ReleaseNotes />,
            loader: ReleaseNotes.loader,
          },
          {
            path: "changelog/edit",
            element: <CreateReleaseNotes />,
            loader: ReleaseNotes.loader,
          },
          {
            path: ":id/*",
            children: [
              {
                path: "",
                element: <AdminVote />,
                loader: AdminVote.loader,
              },
              {
                path: "edit",
                element: <Edit />,
                loader: Edit.loader,
              },
              {
                path: "answers",
                element: <Answers />,
                loader: Answers.loader,
              },
              {
                path: "share",
                element: <Share />,
              },
              {
                path: "delete",
                element: <Delete />,
                loader: AdminVote.loader,
              },
              {
                path: "schedule",
                element: <Schedule />,
                loader: AdminVote.loader,
              },
              {
                path: "match",
                element: <Match />,
                loader: Match.loader,
              },
              {
                path: "assign",
                element: <Assign />,
                loader: Assign.loader,
              },
              {
                path: "export",
                element: <Export />,
                loader: AdminVote.loader,
              },
              {
                path: "results",
                element: <Results />,
                loader: Results.loader,
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

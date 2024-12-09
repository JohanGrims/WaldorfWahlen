import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ErrorPage from "./Error";
import "./styles.css";

import "mdui";
import { setColorScheme, setTheme } from "mdui";
import "mdui/mdui.css";

setColorScheme("#f89e24");
setTheme(localStorage.getItem("theme") || "dark");

const routes = [
  {
    path: "/",
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        lazy: async () => ({
          loader: (await import("./App")).default.loader,
          Component: (await import("./App")).default,
        }),
      },
      {
        path: "/:id",
        lazy: async () => ({
          loader: (await import("./Gateway")).default.loader,
          Component: (await import("./Gateway")).default,
        }),
      },
      {
        path: "/v/:id",
        lazy: async () => ({
          loader: (await import("./Vote")).default.loader,
          Component: (await import("./Vote")).default,
        }),
      },
      {
        path: "/r/:id",
        lazy: async () => ({
          loader: (await import("./Vote")).default.loader,
          Component: (await import("./Result")).default,
        }),
      },
      {
        path: "/x/:id",
        lazy: async () => ({
          loader: (await import("./Vote")).default.loader,
          Component: (await import("./Submitted")).default,
        }),
      },
      {
        path: "/s/:id",
        lazy: async () => ({
          loader: (await import("./Vote")).default.loader,
          Component: (await import("./Scheduled")).default,
        }),
      },
      {
        path: "/admin/*",
        lazy: async () => ({
          Component: (await import("./admin/index")).default,
        }),
        children: [
          {
            path: "",
            lazy: async () => ({
              loader: (await import("./admin/Overview")).default.loader,
              Component: (await import("./admin/Overview")).default,
            }),
          },
          {
            path: "new",
            lazy: async () => ({
              Component: (await import("./admin/NewVote")).default,
            }),
          },
          {
            path: "students/:classId/:edit?",
            lazy: async () => ({
              loader: (await import("./admin/Students")).default.loader,
              Component: (await import("./admin/Students")).default,
            }),
          },
          {
            path: "settings",
            lazy: async () => ({
              Component: (await import("./admin/Settings")).default,
            }),
          },
          {
            path: "help",
            lazy: async () => ({
              loader: (await import("./admin/Help")).default.loader,
              Component: (await import("./admin/Help")).default,
            }),
          },
          {
            path: "help/edit",
            lazy: async () => ({
              loader: (await import("./admin/Help")).default.loader,
              Component: (await import("./admin/CreateHelp")).default,
            }),
          },
          {
            path: "changelog",
            lazy: async () => ({
              loader: (await import("./admin/ReleaseNotes")).default.loader,
              Component: (await import("./admin/ReleaseNotes")).default,
            }),
          },
          {
            path: "changelog/edit",
            lazy: async () => ({
              loader: (await import("./admin/ReleaseNotes")).default.loader,
              Component: (await import("./admin/CreateReleaseNotes")).default,
            }),
          },
          {
            path: ":id/*",
            children: [
              {
                path: "",
                lazy: async () => ({
                  loader: (await import("./admin/vote/index")).default.loader,
                  Component: (await import("./admin/vote/index")).default,
                }),
              },
              {
                path: "edit",
                lazy: async () => ({
                  loader: (await import("./admin/vote/Edit")).default.loader,
                  Component: (await import("./admin/vote/Edit")).default,
                }),
              },
              {
                path: "answers",
                lazy: async () => ({
                  loader: (await import("./admin/vote/Answers")).default.loader,
                  Component: (await import("./admin/vote/Answers")).default,
                }),
              },
              {
                path: "share",
                lazy: async () => ({
                  Component: (await import("./admin/vote/Share")).default,
                }),
              },
              {
                path: "delete",
                lazy: async () => ({
                  loader: (await import("./admin/vote/index")).default.loader,
                  Component: (await import("./admin/vote/Delete")).default,
                }),
              },
              {
                path: "schedule",
                lazy: async () => ({
                  loader: (await import("./admin/vote/index")).default.loader,
                  Component: (await import("./admin/vote/Schedule")).default,
                }),
              },
              {
                path: "match",
                lazy: async () => ({
                  loader: (await import("./admin/vote/Match")).default.loader,
                  Component: (await import("./admin/vote/Match")).default,
                }),
              },
              {
                path: "assign",
                lazy: async () => ({
                  loader: (await import("./admin/vote/Assign")).default.loader,
                  Component: (await import("./admin/vote/Assign")).default,
                }),
              },
              {
                path: "export",
                lazy: async () => ({
                  loader: (await import("./admin/vote/index")).default.loader,
                  Component: (await import("./admin/vote/Export")).default,
                }),
              },
              {
                path: "results",
                lazy: async () => ({
                  loader: (await import("./admin/vote/Results")).default.loader,
                  Component: (await import("./admin/vote/Results")).default,
                }),
              },
              {
                path: "add",
                lazy: async () => ({
                  loader: (await import("./admin/vote/Add")).default.loader,
                  Component: (await import("./admin/vote/Add")).default,
                }),
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

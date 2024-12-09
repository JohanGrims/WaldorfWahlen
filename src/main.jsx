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
        lazy: async () => {
          const module = await import("./App");
          return {
            loader: module.default.loader,
            Component: module.default,
          };
        },
      },
      {
        path: "/:id",
        lazy: async () => {
          const module = await import("./Gateway");
          return {
            loader: module.default.loader,
            Component: module.default,
          };
        },
      },
      {
        path: "/v/:id",
        lazy: async () => {
          const module = await import("./Vote");
          return {
            loader: module.default.loader,
            Component: module.default,
          };
        },
      },
      {
        path: "/r/:id",
        lazy: async () => {
          const loaderModule = await import("./Vote");
          const componentModule = await import("./Result");
          return {
            loader: loaderModule.default.loader,
            Component: componentModule.default,
          };
        },
      },
      {
        path: "/x/:id",
        lazy: async () => {
          const loaderModule = await import("./Vote");
          const componentModule = await import("./Submitted");
          return {
            loader: loaderModule.default.loader,
            Component: componentModule.default,
          };
        },
      },
      {
        path: "/s/:id",
        lazy: async () => {
          const loaderModule = await import("./Vote");
          const componentModule = await import("./Scheduled");
          return {
            loader: loaderModule.default.loader,
            Component: componentModule.default,
          };
        },
      },
      {
        path: "/admin/*",
        lazy: async () => {
          const module = await import("./admin/index");
          return {
            Component: module.default,
          };
        },
        children: [
          {
            path: "",
            lazy: async () => {
              const module = await import("./admin/Overview");
              return {
                loader: module.default.loader,
                Component: module.default,
              };
            },
          },
          {
            path: "new",
            lazy: async () => {
              const module = await import("./admin/NewVote");
              return {
                Component: module.default,
              };
            },
          },
          {
            path: "students/:classId/:edit?",
            lazy: async () => {
              const module = await import("./admin/Students");
              return {
                loader: module.default.loader,
                Component: module.default,
              };
            },
          },
          {
            path: "settings",
            lazy: async () => {
              const module = await import("./admin/Settings");
              return {
                Component: module.default,
              };
            },
          },
          {
            path: "help",
            lazy: async () => {
              const module = await import("./admin/Help");
              return {
                loader: module.default.loader,
                Component: module.default,
              };
            },
          },
          {
            path: "help/edit",
            lazy: async () => {
              const loaderModule = await import("./admin/Help");
              const componentModule = await import("./admin/CreateHelp");
              return {
                loader: loaderModule.default.loader,
                Component: componentModule.default,
              };
            },
          },
          {
            path: "changelog",
            lazy: async () => {
              const module = await import("./admin/ReleaseNotes");
              return {
                loader: module.default.loader,
                Component: module.default,
              };
            },
          },
          {
            path: "changelog/edit",
            lazy: async () => {
              const loaderModule = await import("./admin/ReleaseNotes");
              const componentModule = await import(
                "./admin/CreateReleaseNotes"
              );
              return {
                loader: loaderModule.default.loader,
                Component: componentModule.default,
              };
            },
          },
          {
            path: ":id/*",
            children: [
              {
                path: "",
                lazy: async () => {
                  const module = await import("./admin/vote/index");
                  return {
                    loader: module.default.loader,
                    Component: module.default,
                  };
                },
              },
              {
                path: "edit",
                lazy: async () => {
                  const module = await import("./admin/vote/Edit");
                  return {
                    loader: module.default.loader,
                    Component: module.default,
                  };
                },
              },
              {
                path: "answers",
                lazy: async () => {
                  const module = await import("./admin/vote/Answers");
                  return {
                    loader: module.default.loader,
                    Component: module.default,
                  };
                },
              },
              {
                path: "share",
                lazy: async () => {
                  const module = await import("./admin/vote/Share");
                  return {
                    Component: module.default,
                  };
                },
              },
              {
                path: "delete",
                lazy: async () => {
                  const loaderModule = await import("./admin/vote/index");
                  const componentModule = await import("./admin/vote/Delete");
                  return {
                    loader: loaderModule.default.loader,
                    Component: componentModule.default,
                  };
                },
              },
              {
                path: "schedule",
                lazy: async () => {
                  const loaderModule = await import("./admin/vote/index");
                  const componentModule = await import("./admin/vote/Schedule");
                  return {
                    loader: loaderModule.default.loader,
                    Component: componentModule.default,
                  };
                },
              },
              {
                path: "match",
                lazy: async () => {
                  const module = await import("./admin/vote/Match");
                  return {
                    loader: module.default.loader,
                    Component: module.default,
                  };
                },
              },
              {
                path: "assign",
                lazy: async () => {
                  const module = await import("./admin/vote/Assign");
                  return {
                    loader: module.default.loader,
                    Component: module.default,
                  };
                },
              },
              {
                path: "export",
                lazy: async () => {
                  const loaderModule = await import("./admin/vote/index");
                  const componentModule = await import("./admin/vote/Export");
                  return {
                    loader: loaderModule.default.loader,
                    Component: componentModule.default,
                  };
                },
              },
              {
                path: "results",
                lazy: async () => {
                  const module = await import("./admin/vote/Results");
                  return {
                    loader: module.default.loader,
                    Component: module.default,
                  };
                },
              },
              {
                path: "add",
                lazy: async () => {
                  const module = await import("./admin/vote/Add");
                  return {
                    loader: module.default.loader,
                    Component: module.default,
                  };
                },
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

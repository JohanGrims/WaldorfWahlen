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
          const module = await import(
            /* webpackChunkName: "App" */
            "./App"
          );
          return {
            loader: module.default.loader,
            Component: module.default,
          };
        },
      },
      {
        path: "/:id",
        lazy: async () => {
          const module = await import(
            /* webpackChunkName: "Gateway" */
            "./Gateway"
          );
          return {
            loader: module.default.loader,
            Component: module.default,
          };
        },
      },
      {
        path: "/v/:id",
        lazy: async () => {
          const module = await import(
            /* webpackChunkName: "Vote" */
            "./Vote"
          );
          return {
            loader: module.default.loader,
            Component: module.default,
          };
        },
      },
      {
        path: "/r/:id",
        lazy: async () => {
          const loaderModule = await import(
            /* webpackChunkName: "Vote" */
            "./Vote"
          );
          const componentModule = await import(
            /* webpackChunkName: "Result" */
            "./Result"
          );
          return {
            loader: loaderModule.default.loader,
            Component: componentModule.default,
          };
        },
      },
      {
        path: "/x/:id",
        lazy: async () => {
          const loaderModule = await import(
            /* webpackChunkName: "Vote" */
            "./Vote"
          );
          const componentModule = await import(
            /* webpackChunkName: "Submitted" */
            "./Submitted"
          );
          return {
            loader: loaderModule.default.loader,
            Component: componentModule.default,
          };
        },
      },
      {
        path: "/s/:id",
        lazy: async () => {
          const loaderModule = await import(
            /* webpackChunkName: "Vote" */
            "./Vote"
          );
          const componentModule = await import(
            /* webpackChunkName: "Scheduled" */
            "./Scheduled"
          );
          return {
            loader: loaderModule.default.loader,
            Component: componentModule.default,
          };
        },
      },
      {
        path: "/admin/*",
        lazy: async () => {
          const module = await import(
            /* webpackChunkName: "Admin" */
            "./admin/index"
          );
          return {
            Component: module.default,
          };
        },
        children: [
          {
            path: "",
            lazy: async () => {
              const module = await import(
                /* webpackChunkName: "Overview" */
                "./admin/Overview"
              );
              return {
                loader: module.default.loader,
                Component: module.default,
              };
            },
          },
          {
            path: "new",
            lazy: async () => {
              const module = await import(
                /* webpackChunkName: "NewVote" */
                "./admin/NewVote"
              );
              return {
                Component: module.default,
              };
            },
          },
          {
            path: "students/:classId/:edit?",
            lazy: async () => {
              const module = await import(
                /* webpackChunkName: "Students" */
                "./admin/Students"
              );
              return {
                loader: module.default.loader,
                Component: module.default,
              };
            },
          },
          {
            path: "settings",
            lazy: async () => {
              const module = await import(
                /* webpackChunkName: "Settings" */
                "./admin/Settings"
              );
              return {
                Component: module.default,
              };
            },
          },
          {
            path: "help",
            lazy: async () => {
              const module = await import(
                /* webpackChunkName: "Help" */
                "./admin/Help"
              );
              return {
                loader: module.default.loader,
                Component: module.default,
              };
            },
          },
          {
            path: "help/edit",
            lazy: async () => {
              const loaderModule = await import(
                /* webpackChunkName: "Help" */
                "./admin/Help"
              );
              const componentModule = await import(
                /* webpackChunkName: "CreateHelp" */
                "./admin/CreateHelp"
              );
              return {
                loader: loaderModule.default.loader,
                Component: componentModule.default,
              };
            },
          },
          {
            path: "changelog",
            lazy: async () => {
              const module = await import(
                /* webpackChunkName: "ReleaseNotes" */
                "./admin/ReleaseNotes"
              );
              return {
                loader: module.default.loader,
                Component: module.default,
              };
            },
          },
          {
            path: "changelog/edit",
            lazy: async () => {
              const loaderModule = await import(
                /* webpackChunkName: "ReleaseNotes" */
                "./admin/ReleaseNotes"
              );
              const componentModule = await import(
                /* webpackChunkName: "CreateReleaseNotes" */
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
                  const module = await import(
                    /* webpackChunkName: "VoteAdmin" */
                    "./admin/vote/index"
                  );
                  return {
                    loader: module.default.loader,
                    Component: module.default,
                  };
                },
              },
              {
                path: "edit",
                lazy: async () => {
                  const module = await import(
                    /* webpackChunkName: "EditVote" */
                    "./admin/vote/Edit"
                  );
                  return {
                    loader: module.default.loader,
                    Component: module.default,
                  };
                },
              },
              {
                path: "answers",
                lazy: async () => {
                  const module = await import(
                    /* webpackChunkName: "Answers" */
                    "./admin/vote/Answers"
                  );
                  return {
                    loader: module.default.loader,
                    Component: module.default,
                  };
                },
              },
              {
                path: "share",
                lazy: async () => {
                  const module = await import(
                    /* webpackChunkName: "Share" */
                    "./admin/vote/Share"
                  );
                  return {
                    Component: module.default,
                  };
                },
              },
              {
                path: "delete",
                lazy: async () => {
                  const loaderModule = await import(
                    /* webpackChunkName: "VoteAdmin" */
                    "./admin/vote/index"
                  );
                  const componentModule = await import(
                    /* webpackChunkName: "Delete" */
                    "./admin/vote/Delete"
                  );
                  return {
                    loader: loaderModule.default.loader,
                    Component: componentModule.default,
                  };
                },
              },
              {
                path: "schedule",
                lazy: async () => {
                  const loaderModule = await import(
                    /* webpackChunkName: "VoteAdmin" */
                    "./admin/vote/index"
                  );
                  const componentModule = await import(
                    /* webpackChunkName: "Schedule" */
                    "./admin/vote/Schedule"
                  );
                  return {
                    loader: loaderModule.default.loader,
                    Component: componentModule.default,
                  };
                },
              },
              {
                path: "match",
                lazy: async () => {
                  const module = await import(
                    /* webpackChunkName: "Match" */
                    "./admin/vote/Match"
                  );
                  return {
                    loader: module.default.loader,
                    Component: module.default,
                  };
                },
              },
              {
                path: "assign",
                lazy: async () => {
                  const module = await import(
                    /* webpackChunkName: "Assign" */
                    "./admin/vote/Assign"
                  );
                  return {
                    loader: module.default.loader,
                    Component: module.default,
                  };
                },
              },
              {
                path: "export",
                lazy: async () => {
                  const loaderModule = await import(
                    /* webpackChunkName: "VoteAdmin" */
                    "./admin/vote/index"
                  );
                  const componentModule = await import(
                    /* webpackChunkName: "Export" */
                    "./admin/vote/Export"
                  );
                  return {
                    loader: loaderModule.default.loader,
                    Component: componentModule.default,
                  };
                },
              },
              {
                path: "results",
                lazy: async () => {
                  const module = await import(
                    /* webpackChunkName: "Results" */
                    "./admin/vote/Results"
                  );
                  return {
                    loader: module.default.loader,
                    Component: module.default,
                  };
                },
              },
              {
                path: "add",
                lazy: async () => {
                  const module = await import(
                    /* webpackChunkName: "Add" */
                    "./admin/vote/Add"
                  );
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

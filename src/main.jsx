import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ErrorPage from "./Error";
import "./styles.css";

import "mdui";
import { alert, setColorScheme, setTheme } from "mdui";
import "mdui/mdui.css";
import { getToken } from "firebase/app-check";
import { appCheck } from "./firebase";

setColorScheme("#f89e24");
setTheme(localStorage.getItem("theme") || "dark");

const routes = [
  {
    path: "/",
    errorElement: <ErrorPage />,
    HydrateFallback: () => <mdui-linear-progress />,
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
            path: "*",
            errorElement: <ErrorPage />,
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
                path: "exports",
                lazy: async () => {
                  const module = await import(
                    /* webpackChunkName: "Exports" */
                    "./admin/Exports"
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
                    "./admin/docs/Help"
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
                    "./admin/docs/Help"
                  );
                  const componentModule = await import(
                    /* webpackChunkName: "CreateHelp" */
                    "./admin/docs/CreateHelp"
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
                    "./admin/docs/ReleaseNotes"
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
                    "./admin/docs/ReleaseNotes"
                  );
                  const componentModule = await import(
                    /* webpackChunkName: "CreateReleaseNotes" */
                    "./admin/docs/CreateReleaseNotes"
                  );
                  return {
                    loader: loaderModule.default.loader,
                    Component: componentModule.default,
                  };
                },
              },
              {
                path: "admins",
                lazy: async () => {
                  const module = await import(
                    /* webpackChunkName: "Admins" */
                    "./admin/Admins"
                  );
                  return {
                    loader: module.default.loader,
                    Component: module.default,
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
    ],
  },
];

const router = createBrowserRouter(routes);

async function verifyAppCheck() {
  try {
    const token = await getToken(appCheck, false);
    if (token === null) {
      console.error("App check token is null");
      return showCaptcha();
    }
  } catch (error) {
    console.error("Error verifying app check:", error);
    return showCaptcha();
  }
}

function showCaptcha() {
  alert({
    icon: "error",
    headline: "Sicherheitsüberprüfung fehlgeschlagen",
    description: "Bitte verifizieren Sie sich als Mensch, um fortzufahren.",
    confirmText: "Verifizieren",
    onConfirm: async () => {
      try {
        // reCAPTCHA Enterprise Challenge starten
        const token = await window.grecaptcha.enterprise.execute(
          "6LfNXNoqAAAAABF77vNghbzVpS2ROyICcK0AJ7Zb",
          { action: "verify" }
        );

        console.log("reCAPTCHA Token:", token);

        // App Check erneut abrufen
        await getToken(appCheck, true);

        alert({
          icon: "check",
          headline: "Verifizierung erfolgreich",
          description: "Sie haben Zugriff auf die Anwendung.",
          confirmText: "Weiter",
        });
      } catch (error) {
        console.error("reCAPTCHA fehlgeschlagen:", error);
        alert({
          icon: "error",
          headline: "Verifizierung fehlgeschlagen",
          description:
            "Bitte versuchen Sie es erneut. Falls das Problem weiterhin besteht, wenden Sie sich an den zuständigen Lehrer.",
          confirmText: "Neu laden",
          onConfirm: () => {
            window.location.reload();
          },
        });
      }
    },
  });
}

// reCAPTCHA Enterprise Skript laden
const script = document.createElement("script");
script.src =
  "https://www.google.com/recaptcha/enterprise.js?render=6LfNXNoqAAAAABF77vNghbzVpS2ROyICcK0AJ7Zb";
script.async = true;
script.defer = true;

script.onload = () => {
  verifyAppCheck();
};

document.body.appendChild(script);


ReactDOM.createRoot(document.getElementById("root")).render(
  <div className="wrapper">
    <RouterProvider router={router} />
  </div>
);

import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import ErrorPage from "./Error.jsx";
import "./styles.css";

import AnswerList from "./admin/AnswerList.jsx";
import AssignStudents, { loader } from "./admin/AssignStudents.tsx";
import Admin from "./admin/index.jsx";
import Overview from "./admin/Overview.jsx";

const App = lazy(() => import("./App.jsx"));
const Result = lazy(() => import("./Result.jsx"));
const Share = lazy(() => import("./Share.jsx"));
const Submitted = lazy(() => import("./Submitted.jsx"));
const Vote = lazy(() => import("./Vote.jsx"));

const Loader = () => (
  <div className="loader-wrapper">
    <div className="loader"></div>
  </div>
);

const router = createBrowserRouter([
  {
    path: "/",
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        element: (
          <Suspense fallback={<Loader />}>
            <App />
          </Suspense>
        ),
      },
      {
        path: "/vote/:id",
        element: (
          <Suspense fallback={<Loader />}>
            <Vote />
          </Suspense>
        ),
      },
      {
        path: "/v/:id",
        element: (
          <Suspense fallback={<Loader />}>
            <Vote />
          </Suspense>
        ),
      },
      {
        path: "/results/:id",
        element: (
          <Suspense fallback={<Loader />}>
            <Result />
          </Suspense>
        ),
      },
      {
        path: "/r/:id",
        element: (
          <Suspense fallback={<Loader />}>
            <Result />
          </Suspense>
        ),
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
            element: <Overview />,
          },
          {
            path: "o/:id",
            element: <AnswerList />,
          },
          {
            path: ":id",
            element: <AssignStudents />,
            loader: loader,
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

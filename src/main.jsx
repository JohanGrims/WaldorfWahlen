import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import ErrorPage from "./Error.jsx";
import "./styles.css";

const App = lazy(() => import("./App.jsx"));
const Result = lazy(() => import("./Result.jsx"));
const Share = lazy(() => import("./Share.jsx"));
const Submitted = lazy(() => import("./Submitted.jsx"));
const Vote = lazy(() => import("./Vote.jsx"));
const Overview = lazy(() => import("./admin/Overview.jsx"));
const VoteDetail = lazy(() => import("./admin/VoteDetail.jsx"));

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
        path: "/admin",
        element: (
          <Suspense fallback={<Loader />}>
            <Overview />
          </Suspense>
        ),
      },
      {
        path: "/admin/:id",
        element: (
          <Suspense fallback={<Loader />}>
            <VoteDetail />
          </Suspense>
        ),
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

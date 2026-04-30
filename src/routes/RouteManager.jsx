import EditorPage from "../(authenticated)/EditorPage.jsx";
import ExportPage from "../(authenticated)/ExportPage.jsx";
import HomePage from "../(authenticated)/HomePage.jsx";
import ReviewPage from "../(authenticated)/ReviewPage.jsx";
import SignInPage from "../(unauthenticated)/SignInPage.jsx";
import { isSignedIn } from "../auth.js";
import { useEffect, useMemo, useState } from "react";

const routes = [
  {
    path: "/sign-in",
    component: SignInPage,
    authentication: false,
  },
  {
    path: "/",
    component: HomePage,
    authentication: true,
  },
  {
    path: "/editor",
    component: EditorPage,
    authentication: true,
  },
  {
    path: "/review",
    component: ReviewPage,
    authentication: true,
  },
  {
    path: "/export",
    component: ExportPage,
    authentication: true,
  },
];

function redirectTo(path) {
  window.history.replaceState({}, "", path);
  window.dispatchEvent(new Event("popstate"));
}

function RouteManager() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [signedIn, setSignedIn] = useState(isSignedIn);

  useEffect(() => {
    const handleNavigation = () => {
      setCurrentPath(window.location.pathname);
      setSignedIn(isSignedIn());
    };

    window.addEventListener("popstate", handleNavigation);
    window.addEventListener("authchange", handleNavigation);

    return () => {
      window.removeEventListener("popstate", handleNavigation);
      window.removeEventListener("authchange", handleNavigation);
    };
  }, []);

  const matchedRoute = useMemo(
    () => routes.find((route) => route.path === currentPath) ?? routes[1],
    [currentPath],
  );

  useEffect(() => {
    if (matchedRoute.authentication && !signedIn) {
      redirectTo("/sign-in");
      return;
    }

    if (!matchedRoute.authentication && signedIn) {
      redirectTo("/");
    }
  }, [matchedRoute, signedIn]);

  if (matchedRoute.authentication && !signedIn) {
    return null;
  }

  if (!matchedRoute.authentication && signedIn) {
    return null;
  }

  const Page = matchedRoute.component;

  return <Page />;
}

export default RouteManager;

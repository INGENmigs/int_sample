import EditorPage from "../(authenticated)/EditorPage.jsx";
import ExportPage from "../(authenticated)/ExportPage.jsx";
import HomePage from "../(authenticated)/HomePage.jsx";
import ReviewPage from "../(authenticated)/ReviewPage.jsx";
import AuthenticatedIndex from "../(authenticated)/_index.jsx";
import SignInPage from "../(unauthenticated)/SignInPage.jsx";
import AiTestPage from "../ai/AiTestPage.jsx";
import { isSignedIn } from "../auth.js";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

function RootLayout() {
  return <Outlet />;
}

function requireAuthentication() {
  if (!isSignedIn()) {
    throw redirect({ to: "/sign-in" });
  }
}

function redirectAuthenticatedUser() {
  if (isSignedIn()) {
    throw redirect({ to: "/" });
  }
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-in",
  beforeLoad: redirectAuthenticatedUser,
  component: SignInPage,
});

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "authenticated",
  beforeLoad: requireAuthentication,
  component: AuthenticatedIndex,
});

const homeRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/",
  component: HomePage,
});

const editorRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/editor",
  component: EditorPage,
});

const editorDocumentRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/editor/$documentId",
  component: EditorPage,
});

const reviewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/review",
  component: ReviewPage,
});

const exportRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/export",
  component: ExportPage,
});

const aiTestRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/ai-test",
  component: AiTestPage,
});

const routeTree = rootRoute.addChildren([
  signInRoute,
  authenticatedRoute.addChildren([
    homeRoute,
    editorRoute,
    editorDocumentRoute,
    reviewRoute,
    exportRoute,
    aiTestRoute,
  ]),
]);

const router = createRouter({ routeTree });

function RouteManager() {
  return <RouterProvider router={router} />;
}

export default RouteManager;

import { Outlet } from "@tanstack/react-router";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";

const authenticatedPages = [
  {
    path: "/",
    title: "Home",
    description: "Overview and navigation for interview workflows.",
  },
  {
    path: "/editor",
    title: "Editor",
    description: "Prepare and edit interview materials.",
  },
  {
    path: "/review",
    title: "Review",
    description: "Review interview content before export.",
  },
  {
    path: "/export",
    title: "Export",
    description: "Package finalized interview materials.",
  },
  {
    path: "/ai-test",
    title: "AI Test",
    description: "Test one Firebase AI Logic prompt.",
  },
];

function AuthenticatedIndex() {
  return (
    <>
      <Header />
      <main className="home-page">
        <Sidebar pages={authenticatedPages} />
        <Outlet />
      </main>
    </>
  );
}

export default AuthenticatedIndex;

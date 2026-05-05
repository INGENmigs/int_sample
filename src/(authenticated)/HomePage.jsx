import { Link } from "@tanstack/react-router";

const files = [
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
];

function HomePage() {
  return (
    <section className="home-content" aria-labelledby="home-title">
      <h2 id="home-title">Authenticated Files</h2>
      <div className="file-list">
        {files.map((file) => (
          <Link key={file.path} to={file.path} className="file-card">
            <span>{file.title}</span>
            <p>{file.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default HomePage;

import { Link, useNavigate } from "@tanstack/react-router";
import { signOut } from "../auth.js";

function Sidebar({ pages }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    signOut();
    await navigate({ to: "/sign-in", replace: true });
  };

  return (
    <aside className="home-sidebar" aria-label="Authenticated pages">
      <div>
        <nav>
          {pages.map((page) => (
            <Link key={page.path} to={page.path} className="sidebar-link">
              {page.title}
            </Link>
          ))}
        </nav>
      </div>
      <button className="sidebar-logout" type="button" onClick={handleLogout}>
        Log out
      </button>
    </aside>
  );
}

export default Sidebar;

import { signIn } from "../auth.js";

function SignInPage() {
  const handleSubmit = (event) => {
    event.preventDefault();
    signIn();
    window.history.replaceState({}, "", "/");
  };

  return (
    <main className="signin-page">
      <form className="signin-panel" onSubmit={handleSubmit}>
        <h1>Sign in</h1>
        <label>
          Email
          <input type="email" name="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}

export default SignInPage;

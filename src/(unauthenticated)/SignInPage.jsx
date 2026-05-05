import { useState } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { signIn } from "../auth.js";
import { useNavigate } from "@tanstack/react-router";

function getSignInErrorMessage(error) {
  switch (error.code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/missing-password":
      return "Password is required.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Try again later.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Unable to sign in. Please try again.";
  }
}

function SignInPage() {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();

    setError("");

    if (!email) {
      setError("Email is required.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { app } = await import("../firebase/client.js");
      const auth = getAuth(app);
      await signInWithEmailAndPassword(auth, email, password);
      signIn();
      await navigate({ to: "/", replace: true });
    } catch (err) {
      console.error("Unable to sign in.", err);
      setError(getSignInErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="signin-page">
      <form className="signin-panel" onSubmit={handleSubmit} noValidate>
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
        {error ? (
          <p className="signin-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}

export default SignInPage;

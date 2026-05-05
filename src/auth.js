const AUTH_STORAGE_KEY = "int_sample_signed_in";

function isSignedIn() {
  return window.localStorage.getItem(AUTH_STORAGE_KEY) === "true";
}

function signIn() {
  window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
  window.dispatchEvent(new Event("authchange"));
}

function signOut() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new Event("authchange"));
}

export { isSignedIn, signIn, signOut };

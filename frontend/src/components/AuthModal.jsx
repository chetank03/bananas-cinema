import { useState } from "react";


const EMPTY_LOGIN = { username: "", password: "" };
const EMPTY_SIGNUP = { username: "", email: "", password: "" };


export function AuthModal({ open, mode, onClose, onSubmit, onGoogleSignIn, onModeChange, loading, error }) {
  const [formState, setFormState] = useState(mode === "signup" ? EMPTY_SIGNUP : EMPTY_LOGIN);

  if (!open) {
    return null;
  }

  function handleChange(key, value) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(formState);
  }

  return (
    <div className="auth-overlay" onClick={onClose} role="presentation">
      <div className="auth-modal" onClick={(event) => event.stopPropagation()}>
        <div className="auth-header">
          <div>
            <p className="section-label">{mode === "signup" ? "Create Account" : "Sign In"}</p>
            <h2>{mode === "signup" ? "Join Bananas Cinema" : "Welcome back"}</h2>
          </div>
          <button className="ghost-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <p className="auth-copy">
          {mode === "signup"
            ? "Create an account to track watched titles, build watchlists, and post reviews."
            : "Sign in to manage watched titles, watchlists, and reviews from your account."}
        </p>

        {error ? <div className="status-banner error">{error}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="auth-username">Username</label>
            <input
              id="auth-username"
              value={formState.username}
              onChange={(event) => handleChange("username", event.target.value)}
            />
          </div>

          {mode === "signup" ? (
            <div className="field">
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                value={formState.email}
                onChange={(event) => handleChange("email", event.target.value)}
              />
            </div>
          ) : null}

          <div className="field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              value={formState.password}
              onChange={(event) => handleChange("password", event.target.value)}
            />
          </div>

          <div className="button-row">
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => onModeChange(mode === "signup" ? "login" : "signup")}
            >
              {mode === "signup" ? "Use sign in instead" : "Create an account"}
            </button>
          </div>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button className="ghost-button auth-google-button" type="button" onClick={onGoogleSignIn} disabled={loading}>
          {loading ? "Please wait..." : "Continue with Google"}
        </button>
      </div>
    </div>
  );
}

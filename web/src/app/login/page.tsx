import { DEMO_CREDENTIALS } from "../../lib/data/seed.mjs";
import { loginAction } from "./actions";

type LoginPageProps = {
  searchParams?:
    | Promise<{
        email?: string;
        error?: string;
      }>
    | {
        email?: string;
        error?: string;
      };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {};
  const errorMessage = getErrorMessage(params.error);
  const defaultEmail = params.email ?? DEMO_CREDENTIALS[0]?.email ?? "";

  return (
    <main
      style={{
        display: "grid",
        minHeight: "100vh",
        placeItems: "center",
        padding: "2rem"
      }}
    >
      <section
        aria-labelledby="login-title"
        style={{
          border: "1px solid #d8dee4",
          borderRadius: "8px",
          maxWidth: "420px",
          padding: "2rem",
          width: "100%"
        }}
      >
        <h1 id="login-title" style={{ marginTop: 0 }}>
          Sign in
        </h1>
        {errorMessage ? (
          <p role="alert" style={{ color: "#b42318" }}>
            {errorMessage}
          </p>
        ) : null}
        <form action={loginAction} style={{ display: "grid", gap: "1rem" }}>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            Email
            <input
              autoComplete="email"
              defaultValue={defaultEmail}
              name="email"
              required
              type="email"
            />
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            Password
            <input
              autoComplete="current-password"
              name="password"
              required
              type="password"
            />
          </label>
          <button type="submit">Sign in</button>
        </form>
        <div style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem" }}>Demo credentials</h2>
          <ul style={{ paddingLeft: "1.25rem" }}>
            {DEMO_CREDENTIALS.map((credential) => (
              <li key={credential.email}>
                <code>{credential.email}</code> / <code>{credential.password}</code>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

function getErrorMessage(error: string | undefined) {
  if (error === "missing") {
    return "Enter an email and password.";
  }

  if (error === "invalid") {
    return "The email or password was not recognized.";
  }

  return null;
}

import "@tanstack/react-start/server-only";
// Loads .env into process.env for local dev. No-op when the file is absent
// or the host already set the variables.
try {
	process.loadEnvFile?.(".env");
} catch {}

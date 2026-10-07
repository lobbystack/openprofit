# openprofit

The `openprofit` package is the command-line tool and local MCP server for [OpenProfit](https://openprofit.dev). Use it to sign in, connect revenue and cost providers with keys from your env files, and let coding agents work with your OpenProfit workspace without pasting keys into a chat. It needs Node.js 20 or later.

## Sign in

Run `login` once per server:

```sh
npx openprofit login
```

The command prints a code and opens your browser. After you approve the code, the CLI saves a token to `~/.config/openprofit/config.json` (or `$XDG_CONFIG_HOME/openprofit/config.json`) with file mode `0600`.

To sign in to a self-hosted instance, pass its URL:

```sh
npx openprofit login --url https://profit.example.com
```

The config keeps one token per server URL, so hosted and self-hosted logins sit side by side. Commands pick the server from `--url`, then `OPENPROFIT_URL`, then the last server you signed in to, then `https://openprofit.dev`. Set `OPENPROFIT_TOKEN` to use a token without signing in, for example in CI.

`openprofit whoami` shows the workspace and server in use. `openprofit logout` deletes the saved token for that server.

## Connect a provider from an env file

The `connect` command reads the key from an env file and sends it to OpenProfit. It never prints the key, error messages included:

```sh
npx openprofit connect stripe --env-file .env --key STRIPE_RESTRICTED_KEY
```

On success it prints `Connected Stripe (<label>), first sync started`. The options:

- `--env-file path`: file to read variables from. Without it, the CLI reads the environment only
- `--key NAME`: env var that holds the provider's secret key, for providers with one secret field
- `--field field=NAME`: read any field from an env var. Repeat it for each field
- `--value field=text`: set a non-secret field, such as a team id. The CLI refuses secret fields here so keys stay out of your shell history
- `--product id`: assign the connection to a product

Providers with several fields take one `--field` per field:

```sh
npx openprofit connect twilio --env-file .env \
  --field accountSid=TWILIO_ACCOUNT_SID \
  --field keySid=TWILIO_API_KEY_SID \
  --field keySecret=TWILIO_API_KEY_SECRET
```

Use a restricted, read-only key when the provider offers one. The [integration pages](https://openprofit.dev/integrations) list the scopes each provider needs.

## Use OpenProfit from a coding agent

`openprofit mcp` runs a Model Context Protocol (MCP) server over stdio. It forwards the tools of your OpenProfit workspace and replaces `connect_provider` with a local version. The agent passes env var names, and the server reads the values on your machine. No tool takes a key value.

When the agent calls `connect_provider` with only a provider, the server looks for known variable names such as `STRIPE_SECRET_KEY`, `OPENAI_ADMIN_KEY` and `VERCEL_TOKEN` in `.env` and `.env.local`. It reports the names it finds so the agent can confirm with you. If it finds none, it returns a one-time link where you enter the key in the browser.

Run `npx openprofit login` before you add the server. Without a token, every tool replies with that instruction.

### Claude Code

Add the server from your project directory:

```sh
claude mcp add openprofit -- npx -y openprofit mcp
```

### Cursor

Add the server to `.cursor/mcp.json` in your project, or to `~/.cursor/mcp.json` for every project:

```json
{
  "mcpServers": {
    "openprofit": {
      "command": "npx",
      "args": ["-y", "openprofit", "mcp"]
    }
  }
}
```

### Claude Desktop

Open **Settings > Developer > Edit Config** and add the same `mcpServers` entry to `claude_desktop_config.json`.

### Env files outside the working directory

The server resolves `.env` and `.env.local` against the directory the client starts it in. If the agent finds no keys although your project has them, ask it to pass the absolute path of your env file as `env_file`.

For a self-hosted instance, add `"--url", "https://profit.example.com"` to `args`, or sign in to that instance last.

## License

MIT

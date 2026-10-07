---
navLabel: Agents and MCP
contentType: How-to
description: Connect Claude Code, Cursor or another MCP client to OpenProfit, and connect providers without pasting keys into the chat.
---

# Connect an AI agent to OpenProfit

Your agent can read your numbers and change your workspace through the Model Context Protocol (MCP), the standard AI clients use to call tools. This page covers API tokens, the remote MCP server, the `openprofit` npm package, and how provider keys stay out of the chat.

## Create an API token

Every agent request carries an API token tied to one workspace. Create one in **Settings**, under **API tokens**:

- **Read**: the agent sees numbers, products, connections and alerts, and can’t change anything
- **Read and write**: the agent can also add and remove products, connections, mappings and flat costs, and turn public pages on or off

OpenProfit shows the token once and stores only its hash. Click **Revoke** next to a token to cut off every agent that uses it. `npx openprofit login` creates a read and write token for you after you approve it in the browser.

## Add the remote MCP server

The server lives at `/mcp` on your instance: `https://openprofit.dev/mcp` on the hosted version, or your `APP_URL` followed by `/mcp` when you self-host. Send the token as a bearer token. In Claude Code:

```bash
claude mcp add --transport http openprofit https://openprofit.dev/mcp \
  --header "Authorization: Bearer your_api_token"
```

Other clients take the same URL and header in their MCP settings. The server speaks Streamable HTTP and serves clients on protocol versions 2025-11-25 and 2026-07-28.

## Use the npm package

The `openprofit` package signs you in from the terminal and runs a local MCP server. That server passes your agent’s calls to the remote one, and its own `connect_provider` reads keys from your env files:

```bash
npx openprofit login
claude mcp add openprofit -- npx -y openprofit mcp
```

`login` shows a code and a link. Open the link, check that the code matches, and pick a workspace. To connect a provider from a key already in an env file, name the variable instead of pasting the key:

```bash
npx openprofit connect openai --env-file .env --key OPENAI_ADMIN_KEY
```

## Keep provider keys out of the chat

No OpenProfit tool takes a raw provider key as an argument, so a key never has to pass through your agent’s context. Your agent connects a provider in one of two ways:

- **From an env file**: the local MCP server’s `connect_provider` reads the variable you name, sends the value to OpenProfit and returns only the account name and sync status
- **Through a one-time link**: the remote server’s `connect_provider` returns a link that works for 15 minutes. You open it, sign in, and enter the key in the browser. Clients that support URL elicitation open the link for you; others show it in the chat. The agent then checks `connection_status` until the connection appears

OpenProfit encrypts the key before storing it. Create restricted, read-only keys where the provider offers them; the link’s page lists the permissions each key needs, and so does the provider’s [integration guide](/integrations).

## Review what agents changed

Tools that delete data, such as `delete_product` and `remove_connection`, carry the MCP `destructiveHint` annotation, so your client can ask you before it runs them. OpenProfit records every change made over MCP or the CLI, and the weekly email lists last week’s changes, public page changes first.

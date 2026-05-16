#!/usr/bin/env node
// Buttondown MCP server — minimal wrapper around the Buttondown v1 API.
// API key read from BUTTONDOWN_API_KEY env var (set in project .mcp.json).

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_BASE = "https://api.buttondown.email/v1";
const API_KEY = process.env.BUTTONDOWN_API_KEY;

if (!API_KEY) {
  console.error("BUTTONDOWN_API_KEY env var is required");
  process.exit(1);
}

async function bd(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Token ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    const err = new Error(
      `Buttondown ${method} ${path} -> ${res.status} ${res.statusText}`,
    );
    err.status = res.status;
    err.body = parsed;
    throw err;
  }
  return parsed;
}

const tools = [
  {
    name: "list_subscribers",
    description:
      "List newsletter subscribers. Optional filters: type (regular/unactivated/unpaid/removed), tag.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string" },
        tag: { type: "string" },
        limit: { type: "number" },
      },
    },
    handler: async ({ type, tag, limit }) => {
      const qs = new URLSearchParams();
      if (type) qs.set("type", type);
      if (tag) qs.set("tag", tag);
      if (limit) qs.set("limit", String(limit));
      const q = qs.toString();
      return bd("GET", `/subscribers${q ? `?${q}` : ""}`);
    },
  },
  {
    name: "get_subscriber",
    description: "Get a subscriber by email address.",
    inputSchema: {
      type: "object",
      properties: { email: { type: "string" } },
      required: ["email"],
    },
    handler: async ({ email }) => {
      return bd("GET", `/subscribers/${encodeURIComponent(email)}`);
    },
  },
  {
    name: "create_subscriber",
    description:
      "Create a subscriber. Pass email, optional notes/tags/metadata. Honors newsletter double-opt-in setting.",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string" },
        notes: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        metadata: { type: "object" },
        referrer_url: { type: "string" },
      },
      required: ["email"],
    },
    handler: async (body) => bd("POST", "/subscribers", body),
  },
  {
    name: "delete_subscriber",
    description: "Delete a subscriber by email.",
    inputSchema: {
      type: "object",
      properties: { email: { type: "string" } },
      required: ["email"],
    },
    handler: async ({ email }) =>
      bd("DELETE", `/subscribers/${encodeURIComponent(email)}`),
  },
  {
    name: "list_emails",
    description: "List broadcasts/emails sent through Buttondown.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number" } },
    },
    handler: async ({ limit }) => {
      const q = limit ? `?limit=${limit}` : "";
      return bd("GET", `/emails${q}`);
    },
  },
  {
    name: "create_email",
    description:
      "Create a draft email (subject + body). Does not send unless you also set status='scheduled' or 'sent' per Buttondown semantics.",
    inputSchema: {
      type: "object",
      properties: {
        subject: { type: "string" },
        body: { type: "string" },
        email_type: { type: "string" },
        publish_date: { type: "string" },
      },
      required: ["subject", "body"],
    },
    handler: async (body) => bd("POST", "/emails", body),
  },
  {
    name: "list_tags",
    description: "List subscriber tags.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => bd("GET", "/tags"),
  },
  {
    name: "list_newsletters",
    description:
      "List newsletters on the account (returns settings dump including domain, theme, locale).",
    inputSchema: { type: "object", properties: {} },
    handler: async () => bd("GET", "/newsletters"),
  },
  {
    name: "ping",
    description: "Health check against the Buttondown API.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => bd("GET", "/ping"),
  },
];

const toolMap = new Map(tools.map((t) => [t.name, t]));

const server = new Server(
  { name: "buttondown", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = toolMap.get(req.params.name);
  if (!tool) {
    return {
      isError: true,
      content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }],
    };
  }
  try {
    const result = await tool.handler(req.params.arguments ?? {});
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `${err.message}\n${err.body ? JSON.stringify(err.body, null, 2) : ""}`,
        },
      ],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);

#!/usr/bin/env node
import { Sandbox } from "@e2b/code-interpreter";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.E2B_API_KEY;
if (!API_KEY) {
  throw new Error("E2B_API_KEY environment variable is required");
}

const toolSchema = z.object({
  code: z.string(),
});

class E2BServer {
  private server: Server;
  private sandbox: Sandbox | undefined;

  constructor() {
    this.server = new Server(
      {
        name: "e2b-code-interpreter-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupSandbox();
    this.setupHandlers();
    this.setupErrorHandling();
  }

  private async setupSandbox(): Promise<void> {
    this.sandbox = await Sandbox.create(
      "vtr3n8sgncl3dumyvo1q",
      {
      apiKey: API_KEY,
      timeoutMs: 300000, // 5 minutes timeout
      }
    );
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers(): void {
    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "run_code",
          description:
            "Run python code in a secure sandbox by E2B. Using the Jupyter Notebook syntax .",
          inputSchema: zodToJsonSchema(toolSchema),
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== "run_code") {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      if (!toolSchema.safeParse(request.params.arguments).success) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Invalid code interpreter arguments"
        );
      }

      const { code } = request.params.arguments as z.infer<typeof toolSchema>;
      const { results, logs } = await (this.sandbox as Sandbox).runCode(code);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ results: results, logs }, null, 2),
          },
        ],
      };
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Although this is just an informative message, we must log to stderr,
    // to avoid interfering with MCP communication that happens on stdout
    console.error("E2B MCP server running on stdio");
  }
}

const server = new E2BServer();
server.run().catch(console.error);

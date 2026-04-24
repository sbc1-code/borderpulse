import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');

export const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT_PATH = path.resolve(__dirname, 'prompts', 'anomaly-draft.md');

function loadSystemPrompt() {
  return fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf8');
}

// Tool schema the model must call to return a structured post.
export const WRITE_POST_TOOL = {
  name: 'write_post_draft',
  description:
    'Return a structured draft post. Call this tool once with the final draft. Do not emit free-form text.',
  input_schema: {
    type: 'object',
    required: ['frontmatter', 'body'],
    properties: {
      frontmatter: {
        type: 'object',
        required: ['title', 'description', 'slug', 'date', 'author', 'pillar', 'lang', 'tags', 'draft', 'humanEdited'],
        properties: {
          title: { type: 'string', maxLength: 80 },
          description: { type: 'string', minLength: 80, maxLength: 180 },
          slug: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
          date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          author: { type: 'string' },
          pillar: { type: 'string', enum: ['data-analysis', 'crossing-guides', 'policy-programs', 'traveler-tips'] },
          lang: { type: 'string', enum: ['en', 'es'] },
          tags: { type: 'array', items: { type: 'string' }, maxItems: 6 },
          relatedCrossings: { type: 'array', items: { type: 'string' } },
          officialSources: {
            type: 'array',
            items: {
              type: 'object',
              required: ['label', 'url'],
              properties: {
                label: { type: 'string' },
                url: { type: 'string' },
              },
            },
          },
          draft: { type: 'boolean' },
          humanEdited: { type: 'boolean' },
          source: { type: 'string' },
        },
      },
      body: {
        type: 'string',
        description: 'MDX body content. No frontmatter fences. May include MDX components like <BestTimeChart> and <OfficialSource>.',
      },
    },
  },
};

let clientInstance = null;
function getClient() {
  if (!clientInstance) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set. Add it to .env or the GitHub Actions secret.');
    }
    clientInstance = new Anthropic({ apiKey });
  }
  return clientInstance;
}

export async function callDrafter({ userMessage, maxTokens = 3000 }) {
  const client = getClient();
  const systemPrompt = loadSystemPrompt();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [WRITE_POST_TOOL],
    tool_choice: { type: 'tool', name: 'write_post_draft' },
    messages: [{ role: 'user', content: userMessage }],
  });

  const toolUse = response.content.find((c) => c.type === 'tool_use' && c.name === 'write_post_draft');
  if (!toolUse) {
    throw new Error('Model did not call write_post_draft tool. Got: ' + JSON.stringify(response.content));
  }
  return toolUse.input;
}

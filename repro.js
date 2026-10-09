// MRE: MCP-style image tool result reaches the AI SDK v5 model prompt
// as spec-v3 `image-data` instead of a `media` part.
const { convertMessages } = require('@mastra/core/agent/message-list');

const dbMessages = [
  {
    id: 'msg-tool-db',
    role: 'assistant',
    createdAt: new Date(),
    content: {
      format: 2,
      parts: [
        {
          type: 'tool-invocation',
          toolInvocation: {
            toolCallId: 'call-mcp-media',
            toolName: 'screenshot',
            state: 'result',
            args: {},
            result: {
              // shape an MCP tool returns when the tool result contains an image
              content: [
                { type: 'text', text: 'Screenshot captured' },
                { type: 'image', data: 'base64image', mimeType: 'image/png' },
              ],
            },
          },
        },
      ],
    },
  },
];

const modelMessages = convertMessages(dbMessages).to('AIV5.Model');
const toolMessage = modelMessages.find(m => m.role === 'tool');
const toolResult = toolMessage.content.find(p => p.type === 'tool-result');
console.log('tool-result output parts:');
console.log(JSON.stringify(toolResult.output, null, 2));
const partTypes = toolResult.output.value.map(p => p.type);
console.log('part types:', partTypes.join(', '));
console.log(
  partTypes.every(t => t === 'text' || t === 'media')
    ? 'OK: only text/media parts (valid LanguageModelV2ToolResultOutput content)'
    : 'BUG: invalid part types for LanguageModelV2ToolResultOutput content union (text | media)'
);

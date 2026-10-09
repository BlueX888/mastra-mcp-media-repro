# mastra-mcp-media-repro

Minimal reproduction for a Mastra bug: **MCP image/audio tool results are emitted into the AI SDK v5 model prompt as spec-v3 `image-data` / `file-data` parts, which are not part of the `LanguageModelV2ToolResultOutput` `content` union (`text` | `media`).**

`convertMcpContentToolResultOutput` (`packages/core/src/agent/message-list/conversion/output-converter.ts`, `convertMcpContentToolResultOutput` at `:497`, emitting at `:519`/`:523` on current `main`) converts MCP-style tool results (`{ content: [...] }`) into the v5 tool-result output, but emits `image-data`/`file-data` — the spec-v3 (AI SDK v6) shapes — inside the v5 `content` value.

What that causes per provider spec:

- **spec-v2 (v5) providers** map only `text`/`media` tool-result content parts, so the `image-data` item becomes `undefined` and the image is silently dropped from the request.
- **spec-v4 (v7) providers**: `aiV5PromptToAIV7Prompt` only converts `media`/`image-url`/`file-url` parts, so `image-data` passes through unconverted and providers reject it with `unsupported tool content part type: image-data` (Bedrock throws on it — the [#19658](https://github.com/mastra-ai/mastra/issues/19658) symptom).
- **spec-v3 (v6) providers** only work by accident: `aiV5PromptToAIV6Prompt` leaves `image-data`/`file-data` untouched, which happens to be the valid v3 shape.

This is the remaining gap after [#19755](https://github.com/mastra-ai/mastra/pull/19755) fixed the `toModelOutput` path reported in [#19658](https://github.com/mastra-ai/mastra/issues/19658): MCP auto-detected tool results still emit `image-data` directly, so image/audio results from MCP tools still never reach spec-v2/spec-v4 providers.

## Run

```bash
npm install
node repro.js
```

## Output on @mastra/core 1.75.0 (latest release)

```text
tool-result output parts:
{
  "type": "content",
  "value": [
    {
      "type": "text",
      "text": "Screenshot captured"
    },
    {
      "type": "image-data",
      "data": "base64image",
      "mediaType": "image/png"
    }
  ]
}
part types: text, image-data
BUG: invalid part types for LanguageModelV2ToolResultOutput content union (text | media)
```

## Expected

The image part is emitted as `{ "type": "media", "data": "base64image", "mediaType": "image/png" }` — the shape the v5 layer already standardizes on elsewhere (`normalizeModelOutput`), so the spec-boundary converters translate it for v6/v7 providers instead of dropping or rejecting it.

Fix with tests: [mastra-ai/mastra#25093](https://github.com/mastra-ai/mastra/pull/25093)

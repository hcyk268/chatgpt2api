# Upstream Conversation SSE protocol

Conversation SSE is the streaming protocol for upstream chat. Each SSE `data:` line is usually a JSON payload, a protocol marker, or an end marker. Clients consume payloads in order and maintain session state, text content, tool call state, and image result pointers.

## Basic shape

Typical payloads:

```text
"v1"
{"type":"resume_conversation_token",...}
{"p":"","o":"add","v":{...}}
{"v":{...}}
{"p":"/message/content/parts/0","o":"append","v":"..."}
{"type":"server_ste_metadata","metadata":{...}}
[DONE]
```

Handling guide:

| payload | Meaning | Action |
|:--|:--|:--|
| `"v1"` | Protocol version | Log if needed; usually no business impact |
| `[DONE]` | End of SSE stream | Stop reading |
| JSON object | Event, message, or patch | Update session state by fields |
| JSON string | Short text patch or marker | Handle in context |
| Non-JSON | Raw content | Keep as raw event; do not break the stream |

## Common fields

| Field | Description |
|:--|:--|
| `type` | Event type, e.g. `resume_conversation_token`, `input_message`, `message_marker`, `title_generation`, `server_ste_metadata` |
| `conversation_id` | Current conversation ID; may appear on multiple events |
| `p` | Patch path, e.g. `/message/content/parts/0` |
| `o` | Patch op: `add`, `append`, `replace`, `patch` |
| `v` | Patch value: string, array, or full message |
| `c` | Message index or cursor; common on add events |
| `message.id` | Message ID |
| `message.author.role` | `system`, `user`, `assistant`, `tool` |
| `message.content.content_type` | e.g. `text`, `multimodal_text`, `model_editable_context` |
| `message.content.parts` | Text, image pointers, or multimodal objects |
| `message.status` | e.g. `in_progress`, `finished_successfully` |
| `message.end_turn` | Whether the turn ended |
| `metadata.tool_invoked` | Whether a tool was invoked this turn |
| `metadata.turn_use_case` | e.g. `text`, `multimodal` |
| `metadata.async_task_type` | Async tool type; image gen is usually `image_gen` |

## Session start

Upstream often returns a resume or session token first:

```json
{
  "type": "resume_conversation_token",
  "kind": "topic",
  "token": "...",
  "conversation_id": "..."
}
```

Used to identify the conversation and restore context. Business layer usually only stores `conversation_id`; do not expose `token` downstream.

## Message add

Full messages may arrive via `add` or events with `v.message`:

```json
{
  "p": "",
  "o": "add",
  "v": {
    "message": {
      "author": {"role": "assistant"},
      "content": {"content_type": "text", "parts": [""]},
      "status": "in_progress"
    },
    "conversation_id": "..."
  },
  "c": 3
}
```

Creates a new message. For `assistant`, text is usually appended via patches afterward.

## Text deltas

Text output is often multiple patches:

```json
{"p":"/message/content/parts/0","o":"append","v":"Hello"}
{"v":" world"}
{"p":"","o":"patch","v":[
  {"p":"/message/content/parts/0","o":"append","v":"!"},
  {"p":"/message/status","o":"replace","v":"finished_successfully"},
  {"p":"/message/end_turn","o":"replace","v":true}
]}
```

Handling:

| Shape | Meaning |
|:--|:--|
| `p == "/message/content/parts/0"` and `o == "append"` | Append to current text |
| `o == "replace"` | Replace target field |
| `o == "patch"` and `v` is array | Batch patches; process in order |
| Only `v` and `v` is string | Pathless text delta; use current text stream context |

## Input messages

User input appears as `input_message` or normal `user` messages. Image edit requests include reference images:

```json
{
  "type": "input_message",
  "input_message": {
    "author": {"role": "user"},
    "content": {
      "content_type": "multimodal_text",
      "parts": [
        {"asset_pointer": "sediment://file_input"},
        "Edit prompt text"
      ]
    }
  },
  "conversation_id": "..."
}
```

`sediment://...` here is input attachment, not output. Even if downloadable, do not treat as output image.

## Successful image tool

On successful image gen or edit, a tool message usually appears:

```json
{
  "v": {
    "message": {
      "author": {"role": "tool"},
      "content": {
        "content_type": "multimodal_text",
        "parts": [
          {"asset_pointer": "file-service://file_result"},
          {"asset_pointer": "sediment://file_result"}
        ]
      },
      "metadata": {"async_task_type": "image_gen"}
    }
  },
  "conversation_id": "..."
}
```

Treat as output only when all hold:

| Condition | Description |
|:--|:--|
| `message.author.role == "tool"` | From tool message |
| `metadata.async_task_type == "image_gen"` | Image generation task |
| `asset_pointer` is `file-service://...` or `sediment://...` | Resolvable image resource |

## Image pointer types

| Pointer | Typical source | Notes |
|:--|:--|:--|
| `file-service://file_xxx` | Image tool output | Resolve via file download API |
| `sediment://file_xxx` | Input attachment or tool output | Judge by message role |
| `file_upload` | Upload placeholder | Usually not output |

Do not classify output from `file_` or `sediment://` alone. Use message role and task type.

## Policy refusal

When upstream refuses, there is often no tool message—only assistant text:

```text
I can't assist with that request. If you have another type of modification...
```

Common companion events:

```json
{"type":"title_generation","title":"Request Denied","conversation_id":"..."}
```

```json
{
  "type": "server_ste_metadata",
  "metadata": {
    "tool_invoked": false,
    "turn_use_case": "multimodal",
    "did_prompt_contain_image": true
  },
  "conversation_id": "..."
}
```

Handling:

| Condition | Behavior |
|:--|:--|
| Assistant refusal text | Return text message |
| `tool_invoked == false` | No tool result |
| No `role=tool` with `async_task_type=image_gen` | Do not collect output images |
| Image pointers in user input | Still input attachments only |

## Moderation

Some requests return moderation events:

```json
{
  "type": "moderation",
  "moderation_response": {
    "blocked": true
  },
  "conversation_id": "..."
}
```

If `blocked == true`, treat the turn as blocked. Prefer assistant text if present; otherwise return an appropriate error.

## Marker and title events

Auxiliary events:

```json
{"type":"message_marker","marker":"user_visible_token","event":"first"}
{"type":"message_marker","marker":"last_token","event":"last"}
{"type":"title_generation","title":"...","conversation_id":"..."}
```

Used for UI, titles, or stream markers—not content or image results.

## Metadata events

`server_ste_metadata` describes scheduling and tools:

```json
{
  "type": "server_ste_metadata",
  "metadata": {
    "tool_invoked": true,
    "turn_use_case": "multimodal",
    "model_slug": "i-mini-m",
    "did_prompt_contain_image": true
  }
}
```

Common checks:

| Field | Description |
|:--|:--|
| `tool_invoked == true` | Upstream invoked a tool |
| `tool_invoked == false` | No tool; common on refusal or plain text |
| `turn_use_case == "text"` | Handle as text |
| `turn_use_case == "multimodal"` | Multimodal input; not guaranteed image output |
| `did_prompt_contain_image == true` | Input had image; not output |

## Result resolution after stream end

After SSE ends:

1. If image tool output pointers were collected, resolve and download output images.
2. If no output pointers but assistant text and the turn was blocked or had no tool, return text.
3. If no output pointers but `conversation_id` exists, fetch full conversation and look for tool image output.
4. When fetching conversation, only use `role=tool` and `async_task_type=image_gen` messages.
5. If no images and no text, return upstream error or empty result.

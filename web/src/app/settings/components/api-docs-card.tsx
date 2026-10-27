"use client";

import { useEffect, useState } from "react";
import { ChevronDown, FileArchive, FileText, KeyRound, ListChecks, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import webConfig from "@/constants/common-env";
import { getStoredAuthSession } from "@/store/auth";

type ParamRow = [string, string, string];

type ApiDoc = {
  title: string;
  method: string;
  path: string;
  icon: LucideIcon;
  input: ParamRow[];
  output: ParamRow[];
  example: (baseUrl: string, key: string) => string;
};

const docs: ApiDoc[] = [
  {
    title: "Model list",
    method: "GET",
    path: "/v1/models",
    icon: ListChecks,
    input: [["Authorization", "header", "Bearer <auth-key>."]],
    output: [["data", "array", "Model list with id, object, created, owned_by."]],
    example: (baseUrl: string, key: string) => `curl ${baseUrl}/models \\
  -H "Authorization: Bearer ${key}"`,
  },
  {
    title: "Chat completions",
    method: "POST",
    path: "/v1/chat/completions",
    icon: FileText,
    input: [
      ["model", "string", "Model name, e.g. gpt-5-mini; also used for image compatibility."],
      ["messages", "array", "OpenAI-compatible messages array."],
      ["stream", "boolean", "Optional streaming flag."],
      ["n", "number", "Optional; parsed as image count in compatibility mode."],
    ],
    output: [
      ["id", "string", "Response ID."],
      ["choices", "array", "OpenAI-compatible choices."],
      ["usage", "object", "Optional token usage."],
    ],
    example: (baseUrl: string, key: string) => `curl ${baseUrl}/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${key}" \\
  -d '{"model":"gpt-5-mini","messages":[{"role":"user","content":"Hello"}]}'`,
  },
  {
    title: "Responses",
    method: "POST",
    path: "/v1/responses",
    icon: FileText,
    input: [
      ["model", "string", "Model name."],
      ["input", "string | array | object", "User input; image generation extracts the prompt from this."],
      ["tools", "array", "Optional Responses tools."],
      ["stream", "boolean", "Optional streaming flag."],
    ],
    output: [
      ["id", "string", "Response ID."],
      ["output", "array", "Responses-compatible output."],
      ["status", "string", "Response status."],
    ],
    example: (baseUrl: string, key: string) => `curl ${baseUrl}/responses \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${key}" \\
  -d '{"model":"gpt-5-mini","input":"Generate a futuristic city image"}'`,
  },
  {
    title: "Search",
    method: "POST",
    path: "/v1/search",
    icon: ListChecks,
    input: [["prompt", "string", "Search question or retrieval instruction."]],
    output: [
      ["answer", "string", "Answer text; exact fields depend on the response."],
      ["sources", "array", "Optional source citations."],
      ["_account_email", "string", "Account email used for this request."],
    ],
    example: (baseUrl: string, key: string) => `curl ${baseUrl}/search \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${key}" \\
  -d '{"prompt":"Search for latest chatgpt2api usage"}'`,
  },
  {
    title: "Image generation",
    method: "POST",
    path: "/v1/images/generations",
    icon: FileArchive,
    input: [
      ["prompt", "string", "Image generation prompt."],
      ["model", "string", "Optional; default gpt-image-2."],
      ["n", "number", "Optional count; currently 1-4."],
      ["size", "string", "Optional image size."],
      ["quality", "string", "Optional; default auto."],
      ["response_format", "string", "Optional; default b64_json."],
    ],
    output: [
      ["data", "array", "Image result list."],
      ["data[].b64_json", "string", "Base64 image payload."],
      ["data[].url", "string", "Image URL when configured."],
    ],
    example: (baseUrl: string, key: string) => `curl ${baseUrl}/images/generations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${key}" \\
  -d '{"model":"gpt-image-2","prompt":"A minimal product poster","n":1}'`,
  },
  {
    title: "Image edits",
    method: "POST",
    path: "/v1/images/edits",
    icon: FileArchive,
    input: [
      ["image", "file | file[] | URL", "Reference image via multipart upload or JSON URL."],
      ["prompt", "string", "Edit prompt."],
      ["model", "string", "Optional; default gpt-image-2."],
      ["n", "number", "Optional count; currently 1-4."],
      ["size", "string", "Optional image size."],
      ["quality", "string", "Optional; default auto."],
    ],
    output: [
      ["data", "array", "Edited image results."],
      ["data[].b64_json", "string", "Base64 image payload."],
      ["data[].url", "string", "Image URL when configured."],
    ],
    example: (baseUrl: string, key: string) => `curl ${baseUrl}/images/edits \\
  -H "Authorization: Bearer ${key}" \\
  -F "model=gpt-image-2" \\
  -F "prompt=Change to cyberpunk night scene" \\
  -F "image=@./input.png"`,
  },
  {
    title: "Create PPT job",
    method: "POST",
    path: "/v1/ppt/generations",
    icon: FileText,
    input: [
      ["prompt", "string", "PPT requirements; optional but include topic, pages, style, and structure."],
      ["base64_images", "string[]", "Optional image data URLs/base64 as reference assets."],
      ["client_task_id", "string", "Optional client idempotency key; duplicate ID returns existing job."],
    ],
    output: [
      ["id / taskId", "string", "Task ID for polling."],
      ["status", "queued | running | success | error", "Task status."],
      ["kind", "ppt", "Task kind."],
      ["created_at / updated_at", "string", "Created and updated timestamps."],
    ],
    example: (baseUrl: string, key: string) => `curl ${baseUrl}/ppt/generations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${key}" \\
  -d '{"prompt":"Create a quarterly business review PPT within 8 slides","base64_images":[]}'`,
  },
  {
    title: "Create PSD job",
    method: "POST",
    path: "/v1/psd/generations",
    icon: FileArchive,
    input: [
      ["prompt", "string", "PSD split/compose requirements: layers, positions, background, asset zip."],
      ["base64_images", "string[]", "Required: at least one image data URL/base64 as PSD source."],
      ["client_task_id", "string", "Optional client idempotency key."],
    ],
    output: [
      ["id / taskId", "string", "Task ID for polling."],
      ["status", "queued | running | success | error", "Task status."],
      ["kind", "psd", "Task kind."],
      ["error", "string", "Error message on failure."],
    ],
    example: (baseUrl: string, key: string) => `curl ${baseUrl}/psd/generations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${key}" \\
  -d '{"prompt":"Split poster elements by layout into an editable PSD","base64_images":["data:image/png;base64,..."]}'`,
  },
  {
    title: "Task status query",
    method: "GET",
    path: "/v1/editable-file-tasks?ids={taskId1,taskId2}",
    icon: ListChecks,
    input: [["ids", "string", "Optional comma-separated task IDs; omit for all editable-file tasks for the user."]],
    output: [
      ["items", "array", "Task list; successful results include primary_url and zip_url."],
      ["missing_ids", "string[]", "When querying ids, lists missing task IDs."],
      ["result.primary_url", "string", "Primary file download URL."],
      ["result.zip_url", "string", "Asset zip download URL."],
    ],
    example: (baseUrl: string, key: string) => `curl "${baseUrl}/editable-file-tasks?ids=<task_id>" \\
  -H "Authorization: Bearer ${key}"`,
  },
  {
    title: "Download result file",
    method: "GET",
    path: "/files/{file_path}",
    icon: FileArchive,
    input: [["file_path", "string", "Returned from task result URLs; usually no manual assembly needed."]],
    output: [["binary", "file", "Returns pptx/psd/zip file stream."]],
    example: (baseUrl: string, _key: string) => `curl ${baseUrl.replace(/\/v1$/, "")}/files/<file_path> -o result.zip`,
  },
];

const usableModels = ["gpt-image-2", "codex-gpt-image-2", "auto", "gpt-5", "gpt-5-1", "gpt-5-2", "gpt-5-3", "gpt-5-3-mini", "gpt-5-mini"];

function ParamTable({ rows }: { rows: ParamRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-stone-200">
      <table className="w-full text-left text-xs">
        <thead className="bg-stone-50 text-stone-500">
          <tr>
            <th className="px-3 py-2 font-medium">Parameter</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 bg-white">
          {rows.map(([name, type, desc]) => (
            <tr key={name}>
              <td className="px-3 py-2 font-mono text-stone-800">{name}</td>
              <td className="px-3 py-2 font-mono text-stone-500">{type}</td>
              <td className="px-3 py-2 text-stone-600">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ApiDocsCard() {
  const [authKey, setAuthKey] = useState("");
  const serviceBaseUrl = webConfig.apiUrl.replace(/\/$/, "") || (typeof window !== "undefined" ? window.location.origin : "");
  const openAIBaseUrl = `${serviceBaseUrl}/v1`;
  const displayKey = authKey || "<current key>";

  useEffect(() => {
    let active = true;
    void getStoredAuthSession().then((session) => {
      if (active) setAuthKey(session?.key || "");
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
      <CardContent className="space-y-5 p-6">
        <div>
          <div className="flex items-center gap-2 text-base font-semibold text-stone-900">
            <KeyRound className="size-5 text-stone-500" />
            API integration
          </div>
          <p className="mt-1 text-xs leading-6 text-stone-500">
            Third-party apps use OpenAI-compatible APIs; file tasks share the same authentication.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1 rounded-xl border border-stone-200 bg-white px-3 py-2">
            <div className="text-xs text-stone-500">Service URL</div>
            <div className="break-all font-mono text-xs text-stone-800">{serviceBaseUrl}</div>
          </div>
          <div className="space-y-1 rounded-xl border border-stone-200 bg-white px-3 py-2">
            <div className="text-xs text-stone-500">Base URL (OpenAI)</div>
            <div className="break-all font-mono text-xs text-stone-800">{openAIBaseUrl}</div>
          </div>
          <div className="space-y-1 rounded-xl border border-stone-200 bg-white px-3 py-2">
            <div className="text-xs text-stone-500">API Key</div>
            <div className="break-all font-mono text-xs text-stone-800">{displayKey}</div>
          </div>
          <div className="space-y-1 rounded-xl border border-stone-200 bg-white px-3 py-2">
            <div className="text-xs text-stone-500">Headers</div>
            <div className="break-all font-mono text-xs text-stone-800">Authorization: Bearer {displayKey}</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-stone-600">Common models; also call /v1/models</div>
          <div className="flex flex-wrap gap-2">
            {usableModels.map((model) => (
              <span key={model} className="rounded-md border border-stone-200 bg-white px-2 py-1 font-mono text-xs text-stone-700">{model}</span>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {docs.map((item) => {
            const Icon = item.icon;
            return (
              <details key={item.path} className="group rounded-xl border border-stone-200 bg-white px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-stone-900">{item.title}</span>
                      <span className="mt-1 block truncate font-mono text-xs text-stone-500">{item.method} {item.path}</span>
                    </span>
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-stone-400 transition group-open:rotate-180" />
                </summary>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-stone-700">Input parameters</h3>
                    <ParamTable rows={item.input} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-stone-700">Output parameters</h3>
                    <ParamTable rows={item.output} />
                  </div>
                  <div className="space-y-2 lg:col-span-2">
                    <h3 className="text-xs font-semibold text-stone-700">Example</h3>
                    <pre className="overflow-auto whitespace-pre-wrap break-all rounded-xl bg-stone-950 px-3 py-3 text-xs leading-5 text-stone-100">{item.example(openAIBaseUrl, displayKey)}</pre>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

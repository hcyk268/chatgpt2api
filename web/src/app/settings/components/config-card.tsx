"use client";

import { Cloud, LoaderCircle, PlugZap, RefreshCw, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ImageStorageMode } from "@/lib/api";
import { testProxy, type ProxyTestResult } from "@/lib/api";

import { useSettingsStore } from "../store";

export function ConfigCard() {
  const [isTestingProxy, setIsTestingProxy] = useState(false);
  const [proxyTestResult, setProxyTestResult] = useState<ProxyTestResult | null>(null);
  const logLevelOptions = ["debug", "info", "warning", "error"];
  const config = useSettingsStore((state) => state.config);
  const isLoadingConfig = useSettingsStore((state) => state.isLoadingConfig);
  const isSavingConfig = useSettingsStore((state) => state.isSavingConfig);
  const setRefreshAccountIntervalMinute = useSettingsStore((state) => state.setRefreshAccountIntervalMinute);
  const setImageRetentionDays = useSettingsStore((state) => state.setImageRetentionDays);
  const setImagePollTimeoutSecs = useSettingsStore((state) => state.setImagePollTimeoutSecs);
  const setImageAccountConcurrency = useSettingsStore((state) => state.setImageAccountConcurrency);
  const setImageSettleEnabled = useSettingsStore((state) => state.setImageSettleEnabled);
  const setImageRemoveConversationAfterResult = useSettingsStore((state) => state.setImageRemoveConversationAfterResult);
  const setImageRemoveConversationAlways = useSettingsStore((state) => state.setImageRemoveConversationAlways);
  const setImageSettleSecs = useSettingsStore((state) => state.setImageSettleSecs);
  const setImageTimeoutRetrySecs = useSettingsStore((state) => state.setImageTimeoutRetrySecs);
  const setAutoRemoveInvalidAccounts = useSettingsStore((state) => state.setAutoRemoveInvalidAccounts);
  const setAutoRemoveRateLimitedAccounts = useSettingsStore((state) => state.setAutoRemoveRateLimitedAccounts);
  const setAutoReloginAfterRefresh = useSettingsStore((state) => state.setAutoReloginAfterRefresh);
  const setLogLevel = useSettingsStore((state) => state.setLogLevel);
  const setProxy = useSettingsStore((state) => state.setProxy);
  const setBaseUrl = useSettingsStore((state) => state.setBaseUrl);
  const setGlobalSystemPrompt = useSettingsStore((state) => state.setGlobalSystemPrompt);
  const setDefaultUpstreamModelName = useSettingsStore((state) => state.setDefaultUpstreamModelName);
  const setDefaultThinkingEffort = useSettingsStore((state) => state.setDefaultThinkingEffort);
  const setSensitiveWordsText = useSettingsStore((state) => state.setSensitiveWordsText);
  const setAIReviewField = useSettingsStore((state) => state.setAIReviewField);
  const setImageStorageField = useSettingsStore((state) => state.setImageStorageField);
  const setImageR2Field = useSettingsStore((state) => state.setImageR2Field);
  const testImageStorage = useSettingsStore((state) => state.testImageStorage);
  const syncImagesToWebDAV = useSettingsStore((state) => state.syncImagesToWebDAV);
  const isTestingImageStorage = useSettingsStore((state) => state.isTestingImageStorage);
  const isSyncingImageStorage = useSettingsStore((state) => state.isSyncingImageStorage);
  const saveConfig = useSettingsStore((state) => state.saveConfig);

  const handleTestProxy = async () => {
    const candidate = String(config?.proxy || "").trim();
    if (!candidate) {
      toast.error("Enter a proxy URL first");
      return;
    }
    setIsTestingProxy(true);
    setProxyTestResult(null);
    try {
      const data = await testProxy(candidate);
      setProxyTestResult(data.result);
      if (data.result.ok) {
        toast.success(`Proxy OK (${data.result.latency_ms} ms，HTTP ${data.result.status}）`);
      } else {
        toast.error(`Proxy unavailable: ${data.result.error ?? "Unknown error"}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Proxy test failed");
    } finally {
      setIsTestingProxy(false);
    }
  };

  if (isLoadingConfig) {
    return (
      <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
        <CardContent className="flex items-center justify-center p-10">
          <LoaderCircle className="size-5 animate-spin text-stone-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
      <CardContent className="space-y-4 p-6">
        <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-600">
          The admin login key is read from deployment config and is not shown here. Create regular user keys below to share access.
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm text-stone-700">Account refresh interval</label>
            <Input
              value={String(config?.refresh_account_interval_minute || "")}
              onChange={(event) => setRefreshAccountIntervalMinute(event.target.value)}
              placeholder="minutes"
              className="h-10 rounded-xl border-stone-200 bg-white"
            />
            <p className="text-xs text-stone-500">Minutes between automatic account refreshes.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-stone-700">Global proxy</label>
            <Input
              value={String(config?.proxy || "")}
              onChange={(event) => {
                setProxy(event.target.value);
                setProxyTestResult(null);
              }}
              placeholder="http://127.0.0.1:7890"
              className="h-10 rounded-xl border-stone-200 bg-white"
            />
            <p className="text-xs leading-5 text-stone-500">
              Leave empty for no proxy. Supports protocol://user:pass@host:port or host:port:user:pass. URL-encode special characters in credentials.
            </p>
            {proxyTestResult ? (
              <div
                className={`rounded-xl border px-3 py-2 text-xs leading-6 ${
                  proxyTestResult.ok
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-800"
                }`}
              >
                {proxyTestResult.ok
                  ? `Proxy OK: HTTP ${proxyTestResult.status}，latency ${proxyTestResult.latency_ms} ms`
                  : `Proxy unavailable: ${proxyTestResult.error ?? "Unknown error"}（latency ${proxyTestResult.latency_ms} ms）`}
              </div>
            ) : null}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl border-stone-200 bg-white px-4 text-stone-700"
                onClick={() => void handleTestProxy()}
                disabled={isTestingProxy}
              >
                {isTestingProxy ? <LoaderCircle className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
                Test proxy
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-stone-700">Image public base URL</label>
            <Input
              value={String(config?.base_url || "")}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://example.com"
              className="h-10 rounded-xl border-stone-200 bg-white"
            />
            <p className="text-xs text-stone-500">Prefix used when building public image URLs.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-stone-700">Default upstream model name</label>
            <Input
              value={String(config?.default_upstream_model_name || "")}
              onChange={(event) => setDefaultUpstreamModelName(event.target.value)}
              placeholder="gpt-5-5"
              className="h-10 rounded-xl border-stone-200 bg-white"
            />
            <p className="text-xs text-stone-500">Upstream model name for gpt-image-2 image requests. Default gpt-5-5.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-stone-700">Default reasoning effort</label>
            <Select
              value={String(config?.default_thinking_effort || "auto")}
              onValueChange={(value) => setDefaultThinkingEffort(value as "auto" | "standard" | "extended" | "max")}
            >
              <SelectTrigger className="h-10 rounded-xl border-stone-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (omit)</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="extended">Extended</SelectItem>
                <SelectItem value="max">Max</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-stone-500">When the model name ends with -standard, -extended, or -max, that suffix takes precedence.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-stone-700">Auto-delete local images</label>
            <Input
              value={String(config?.image_retention_days || "")}
              onChange={(event) => setImageRetentionDays(event.target.value)}
              placeholder="30"
              className="h-10 rounded-xl border-stone-200 bg-white"
            />
            <p className="text-xs text-stone-500">Delete local images older than this many days.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-stone-700">Image poll timeout</label>
            <Input
              value={String(config?.image_poll_timeout_secs || "")}
              onChange={(event) => setImagePollTimeoutSecs(event.target.value)}
              placeholder="120"
              className="h-10 rounded-xl border-stone-200 bg-white"
            />
            <p className="text-xs text-stone-500">Seconds to wait for upstream image results.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-stone-700">Per-account image concurrency</label>
            <Input
              value={String(config?.image_account_concurrency || "")}
              onChange={(event) => setImageAccountConcurrency(event.target.value)}
              placeholder="1"
              className="h-10 rounded-xl border-stone-200 bg-white"
            />
            <p className="text-xs text-stone-500">Max concurrent image requests per account. Default 3.</p>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700">
              <Checkbox
                checked={Boolean(config?.auto_remove_invalid_accounts)}
                onCheckedChange={(checked) => setAutoRemoveInvalidAccounts(Boolean(checked))}
              />
              Auto-remove invalid accounts
            </label>
            <p className="text-xs text-stone-500">Detect and remove on refresh</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
              <Checkbox
                checked={Boolean(config?.image_settle_enabled !== false)}
                onCheckedChange={(checked) => setImageSettleEnabled(Boolean(checked))}
              />
              <span className="text-sm text-stone-700">Image double-check</span>
            </div>
            <p className="text-xs text-stone-500">Can slightly improve image retrieval success rate.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
              <Checkbox
                checked={Boolean(config?.image_remove_conversation_after_result)}
                onCheckedChange={(checked) => setImageRemoveConversationAfterResult(Boolean(checked))}
              />
              <span className="text-sm text-stone-700">Remove local conversation after success</span>
            </div>
            <p className="text-xs text-stone-500">After a successful image, asynchronously hide the matching local conversation on ChatGPT.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
              <Checkbox
                checked={Boolean(config?.image_remove_conversation_always)}
                onCheckedChange={(checked) => setImageRemoveConversationAlways(Boolean(checked))}
              />
              <span className="text-sm text-stone-700">Remove local conversation even on failure</span>
            </div>
            <p className="text-xs text-stone-500">Also hide conversations on failure, timeout, or text-only responses (includes successful images when enabled).</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-stone-700">Extra wait after image timeout</label>
            <Input
              value={String(config?.image_timeout_retry_secs || "30")}
              onChange={(event) => setImageTimeoutRetrySecs(event.target.value)}
              placeholder="30"
              className="h-10 rounded-xl border-stone-200 bg-white"
            />
            <p className="text-xs text-stone-500">Seconds of extra polling after clicking &quot;Keep waiting&quot;.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-stone-700">Image double-check delay</label>
            <Input
              value={String(config?.image_settle_secs || "2.0")}
              onChange={(event) => setImageSettleSecs(event.target.value)}
              placeholder="2.0"
              className="h-10 rounded-xl border-stone-200 bg-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!config?.image_settle_enabled}
            />
            <p className="text-xs text-stone-500">Seconds to wait before re-checking after an image is found. Requires image double-check.</p>
          </div>
          <div className="flex gap-4 md:col-span-2">
            <div className="flex-1 space-y-2">
              <label className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700">
                <Checkbox
                  checked={Boolean(config?.auto_relogin_after_refresh)}
                  onCheckedChange={(checked) => setAutoReloginAfterRefresh(Boolean(checked))}
                />
                Auto-relogin after refresh
              </label>
              <p className="text-xs text-stone-500">When enabled, refresh attempts password login to recover accounts.</p>
            </div>
            <div className="flex-1" aria-hidden="true" />
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700">
            <Checkbox
              checked={Boolean(config?.auto_remove_rate_limited_accounts)}
              onCheckedChange={(checked) => setAutoRemoveRateLimitedAccounts(Boolean(checked))}
            />
            Auto-remove rate-limited accounts
          </label>
          <div className="space-y-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
            <div>
              <label className="text-sm text-stone-700">Console log levels</label>
              <p className="mt-1 text-xs text-stone-500">Defaults to info / warning / error when none are selected.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {logLevelOptions.map((level) => (
                <label key={level} className="flex items-center gap-2 text-sm capitalize text-stone-700">
                  <Checkbox
                    checked={Boolean(config?.log_levels?.includes(level))}
                    onCheckedChange={(checked) => setLogLevel(level, Boolean(checked))}
                  />
                  {level}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-stone-700">Global system prompt</label>
            <Textarea
              value={String(config?.global_system_prompt || "")}
              onChange={(event) => setGlobalSystemPrompt(event.target.value)}
              placeholder="e.g. Check user prompts for policy violations and refuse illegal, sexual, violent, or hateful requests."
              className="min-h-28 rounded-xl border-stone-200 bg-white font-mono text-xs shadow-none"
            />
            <p className="text-xs text-stone-500">Injected as a system message on every request for moderation, safety, or consistent behavior.</p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-stone-700">Sensitive words</label>
            <Textarea
              value={(config?.sensitive_words || []).join("\n")}
              onChange={(event) => setSensitiveWordsText(event.target.value)}
              placeholder="One per line; any match rejects the request"
              className="min-h-28 rounded-xl border-stone-200 bg-white font-mono text-xs shadow-none"
            />
            <p className="text-xs text-stone-500">Reject the request if it contains any sensitive word.</p>
          </div>
          <div className="space-y-4 rounded-xl border border-stone-200 bg-white px-4 py-3 md:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-3 text-sm text-stone-700">
                <Checkbox
                  checked={Boolean(config?.image_storage?.enabled)}
                  onCheckedChange={(checked) => setImageStorageField("enabled", Boolean(checked))}
                />
                Enable WebDAV image storage
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-xl border-stone-200 bg-white px-4 text-stone-700"
                  onClick={() => void testImageStorage()}
                  disabled={isTestingImageStorage || !config?.image_storage?.enabled}
                >
                  {isTestingImageStorage ? <LoaderCircle className="size-4 animate-spin" /> : <Cloud className="size-4" />}
                  Test WebDAV
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-xl border-stone-200 bg-white px-4 text-stone-700"
                  onClick={() => void syncImagesToWebDAV()}
                  disabled={isSyncingImageStorage || !config?.image_storage?.enabled || config?.image_storage?.mode === "local"}
                >
                  {isSyncingImageStorage ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  Sync all
                </Button>
              </div>
            </div>
            <p className="text-xs leading-6 text-stone-500">
              New images sync on generation; full sync uploads existing local images to WebDAV.
            </p>
            <div className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-xs text-stone-600">
              Pending save mode:
              <span className="ml-1 font-medium text-stone-900">
                {config?.image_storage?.enabled
                  ? config.image_storage.mode === "both"
                    ? "Local + WebDAV"
                    : config.image_storage.mode === "webdav"
                      ? "WebDAV only"
                      : "Local only"
                  : "Local only"}
              </span>
              <span className="ml-2 text-stone-400">Click Save after changes, or use Test/Sync to save automatically.</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm text-stone-700">Storage mode</label>
                <Select
                  value={String(config?.image_storage?.mode || "local")}
                  onValueChange={(value) => setImageStorageField("mode", value as ImageStorageMode)}
                  disabled={!config?.image_storage?.enabled}
                >
                  <SelectTrigger className="h-10 rounded-xl border-stone-200 bg-white shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local only</SelectItem>
                    <SelectItem value="webdav">WebDAV only</SelectItem>
                    <SelectItem value="both">Local + WebDAV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-stone-700">WebDAV URL</label>
                <Input
                  value={String(config?.image_storage?.webdav_url || "")}
                  onChange={(event) => setImageStorageField("webdav_url", event.target.value)}
                  placeholder="https://example.com/dav"
                  className="h-10 rounded-xl border-stone-200 bg-white"
                  disabled={!config?.image_storage?.enabled}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-stone-700">Username</label>
                <Input
                  value={String(config?.image_storage?.webdav_username || "")}
                  onChange={(event) => setImageStorageField("webdav_username", event.target.value)}
                  className="h-10 rounded-xl border-stone-200 bg-white"
                  disabled={!config?.image_storage?.enabled}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-stone-700">Password</label>
                <Input
                  type="password"
                  value={String(config?.image_storage?.webdav_password || "")}
                  onChange={(event) => setImageStorageField("webdav_password", event.target.value)}
                  className="h-10 rounded-xl border-stone-200 bg-white"
                  disabled={!config?.image_storage?.enabled}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-stone-700">Remote directory</label>
                <Input
                  value={String(config?.image_storage?.webdav_root_path || "")}
                  onChange={(event) => setImageStorageField("webdav_root_path", event.target.value)}
                  placeholder="chatgpt2api/images"
                  className="h-10 rounded-xl border-stone-200 bg-white"
                  disabled={!config?.image_storage?.enabled}
                />
              </div>
              <div className="space-y-2 md:col-span-3">
                <label className="text-sm text-stone-700">Public URL prefix</label>
                <Input
                  value={String(config?.image_storage?.public_base_url || "")}
                  onChange={(event) => setImageStorageField("public_base_url", event.target.value)}
                  placeholder="https://cdn.example.com/chatgpt2api/images"
                  className="h-10 rounded-xl border-stone-200 bg-white"
                  disabled={!config?.image_storage?.enabled}
                />
                <p className="text-xs text-stone-500">Empty uses this app&apos;s /images/... proxy; set a value for direct public URLs.</p>
              </div>
            </div>
          </div>
          <section aria-labelledby="image-r2-title" className="overflow-hidden rounded-2xl border border-stone-200 bg-white md:col-span-2">
            <div className="flex flex-col gap-4 border-b border-stone-100 bg-stone-50/70 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
              <div className="flex gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-stone-600 ring-1 ring-stone-200">
                  <Cloud className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 id="image-r2-title" className="text-sm font-semibold text-stone-900">Cloudflare R2 image links</h3>
                  <p className="mt-1 text-xs leading-5 text-stone-500">Upload new images to R2 and return a public link in the response.</p>
                </div>
              </div>
              <label className="flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700">
                <Checkbox
                  checked={Boolean(config?.image_r2?.enabled)}
                  onCheckedChange={(checked) => setImageR2Field("enabled", Boolean(checked))}
                />
                Enable R2
              </label>
            </div>

            <div className="space-y-5 p-4 sm:p-5">
              {!config?.image_r2?.enabled && (
                <p className="rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-600">
                  Enable R2 to enter your bucket details. Uploads and R2 cleanup are currently off in this form.
                </p>
              )}
              <fieldset disabled={!config?.image_r2?.enabled} className="space-y-5 disabled:opacity-60">
                <div>
                  <h4 className="text-sm font-semibold text-stone-800">Bucket and public link</h4>
                  <p className="mt-1 text-xs leading-5 text-stone-500">Use the public custom domain or r2.dev URL for your bucket.</p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    {([
                      ["bucket", "Bucket name", "generated-images"],
                      ["prefix", "Image directory", "chatgpt2api/images"],
                      ["public_base_url", "Public bucket URL", "https://images.example.com"],
                    ] as const).map(([key, label, placeholder]) => (
                      <div key={key} className={key === "public_base_url" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
                        <label htmlFor={`image-r2-${key}`} className="text-sm font-medium text-stone-700">{label}</label>
                        <Input
                          id={`image-r2-${key}`}
                          value={String(config?.image_r2?.[key] || "")}
                          onChange={(event) => setImageR2Field(key, event.target.value)}
                          placeholder={placeholder}
                          className="h-10 rounded-xl border-stone-200 bg-white"
                          aria-describedby={key === "public_base_url" ? "image-r2-public-url-help" : undefined}
                        />
                        {key === "public_base_url" && (
                          <p id="image-r2-public-url-help" className="text-xs leading-5 text-stone-500">Enter the bucket domain without a path. The S3 API endpoint cannot be used as the public URL.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-stone-100 pt-5">
                  <h4 className="text-sm font-semibold text-stone-800">R2 credentials</h4>
                  <p className="mt-1 text-xs leading-5 text-stone-500">Enter the Cloudflare account and R2 API credentials for this bucket.</p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    {([
                      ["account_id", "Account ID"],
                      ["access_key_id", "Access Key ID"],
                      ["secret_access_key", "Secret Access Key"],
                    ] as const).map(([key, label]) => (
                      <div key={key} className={key === "account_id" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
                        <label htmlFor={`image-r2-${key}`} className="text-sm font-medium text-stone-700">{label}</label>
                        <Input
                          id={`image-r2-${key}`}
                          type={key === "account_id" ? "text" : "password"}
                          value={String(config?.image_r2?.[key] || "")}
                          onChange={(event) => setImageR2Field(key, event.target.value)}
                          autoComplete="off"
                          className="h-10 rounded-xl border-stone-200 bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </fieldset>

              <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="text-sm font-medium text-stone-800">Automatic cleanup</p>
                <p className="mt-1 text-xs leading-5 text-stone-600">Every 3 hours, R2 images older than 5 days are deleted. Turning R2 off stops uploads and cleanup.</p>
              </div>
              <div className="flex flex-col gap-3 border-t border-stone-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-stone-500">Changes apply after you save settings.</p>
                <Button type="button" onClick={() => void saveConfig()} disabled={isSavingConfig} className="h-10 rounded-xl bg-stone-950 px-4 text-white hover:bg-stone-800">
                  {isSavingConfig ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save settings
                </Button>
              </div>
            </div>
          </section>
          <div className="space-y-4 rounded-xl border border-stone-200 bg-white px-4 py-3 md:col-span-2">
            <label className="flex items-center gap-3 text-sm text-stone-700">
              <Checkbox
                checked={Boolean(config?.ai_review?.enabled)}
                onCheckedChange={(checked) => setAIReviewField("enabled", Boolean(checked))}
              />
              Enable AI review
            </label>
            <p className="text-xs leading-6 text-stone-500">
              Calls a review model before image generation accounts; rejects disallowed prompts to reduce account risk.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm text-stone-700">Base URL</label>
                <Input value={String(config?.ai_review?.base_url || "")} onChange={(event) => setAIReviewField("base_url", event.target.value)} placeholder="https://api.openai.com" className="h-10 rounded-xl border-stone-200 bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-stone-700">API Key</label>
                <Input value={String(config?.ai_review?.api_key || "")} onChange={(event) => setAIReviewField("api_key", event.target.value)} placeholder="sk-..." className="h-10 rounded-xl border-stone-200 bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-stone-700">Model</label>
                <Input value={String(config?.ai_review?.model || "")} onChange={(event) => setAIReviewField("model", event.target.value)} placeholder="gpt-5.4-mini" className="h-10 rounded-xl border-stone-200 bg-white" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-stone-700">Review prompt</label>
              <Textarea value={String(config?.ai_review?.prompt || "")} onChange={(event) => setAIReviewField("prompt", event.target.value)} placeholder="Decide if the user request is allowed. Reply ALLOW or REJECT only." className="min-h-24 rounded-xl border-stone-200 bg-white text-xs shadow-none" />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            className="h-10 rounded-xl bg-stone-950 px-5 text-white hover:bg-stone-800"
            onClick={() => void saveConfig()}
            disabled={isSavingConfig}
          >
            {isSavingConfig ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

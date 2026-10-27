"use client";

import { LoaderCircle } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthGuard } from "@/lib/use-auth-guard";

import { ChatPanel } from "./components/chat-panel";
import { PptPanel } from "./components/ppt-panel";
import { PsdPanel } from "./components/psd-panel";
import { SearchPanel } from "./components/search-panel";
import { SkillPanel } from "./components/skill-panel";

const tabs = [
  { value: "skills", title: "Search skills" },
  { value: "search", title: "Search" },
  { value: "ppt", title: "PPT" },
  { value: "psd", title: "PSD" },
  { value: "chat", title: "Chat" },
];

export default function DebugPage() {
  const { isCheckingAuth, session } = useAuthGuard(["admin"]);

  if (isCheckingAuth || !session || session.role !== "admin") {
    return (
      <div className="flex min-h-[calc(100vh-49px)] items-center justify-center">
        <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="skills" className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 pb-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Developer tools</h1>
        <p className="text-sm leading-6 text-stone-500">Try search, chat, and document tools in one place.</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-stone-200/70 bg-white/90 px-2 py-1.5 shadow-sm">
      <TabsList variant="line" aria-label="Developer tools" className="min-w-max justify-start">
        {tabs.map(({ value, title }) => (
          <TabsTrigger key={value} value={value}>
            {title}
          </TabsTrigger>
        ))}
      </TabsList>
      </div>
      <TabsContent value="skills">
        <SkillPanel />
      </TabsContent>
      <TabsContent value="search" className="min-h-0">
        <SearchPanel />
      </TabsContent>
      <TabsContent value="ppt" className="min-h-0">
        <PptPanel />
      </TabsContent>
      <TabsContent value="psd" className="min-h-0">
        <PsdPanel />
      </TabsContent>
      <TabsContent value="chat" className="min-h-0">
        <ChatPanel />
      </TabsContent>
    </Tabs>
  );
}

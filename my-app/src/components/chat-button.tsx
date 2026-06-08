"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import {
  CopilotChat,
  CopilotChatAssistantMessage,
  type CopilotChatAssistantMessageProps,
} from "@copilotkit/react-core/v2";

function HiddenToolCallsView() {
  return null;
}

function isDashboardPayload(content: unknown) {
  if (typeof content !== "string") {
    return false;
  }

  return content.includes('"dashboardOverrides"');
}

const EdisonAssistantMessage = Object.assign(function EdisonAssistantMessage(
  props: CopilotChatAssistantMessageProps,
) {
  if (isDashboardPayload(props.message.content)) {
    return null;
  }

  return (
    <CopilotChatAssistantMessage
      {...props}
      toolCallsView={HiddenToolCallsView}
    />
  );
}, CopilotChatAssistantMessage);

export function ChatButton() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;

      const scrollable = Array.from(panel.querySelectorAll<HTMLElement>("*"))
        .filter((element) => element.scrollHeight > element.clientHeight)
        .at(-1);

      if (scrollable) {
        scrollable.scrollTop = scrollable.scrollHeight;
      }
    });
  }, [open]);

  return (
    <>
      <div
        ref={panelRef}
        aria-hidden={!open}
        className={`absolute bottom-16 right-2 z-[100] flex h-[450px] w-[300px] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl transition duration-200 ${
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold text-foreground">
            Edison AI
          </span>
          <button onClick={() => setOpen(false)}>
            <X className="h-4 w-4 text-foreground/60" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <CopilotChat
            messageView={{ assistantMessage: EdisonAssistantMessage }}
            input={{ disclaimer: () => null, className: "pb-4" }}
          />
        </div>
      </div>

      <button
        onClick={() => setOpen(!open)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-edison-green shadow-lg shadow-black/20 text-white transition-transform active:scale-95"
      >
        {open ? (
          <X className="h-5 w-5" strokeWidth={2} />
        ) : (
          <MessageCircle className="h-5 w-5" strokeWidth={2} />
        )}
      </button>
    </>
  );
}

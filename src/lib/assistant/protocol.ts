export type ReadEvidence = {
  tool: string;
  title: string;
  checkedAt: string;
  source: string;
  url?: string;
  ok: boolean;
  rows: { label: string; value: string }[];
};

export type AssistantEvent =
  | { type: "text"; text: string }
  | { type: "evidence"; evidence: ReadEvidence }
  | { type: "status"; text: string }
  | { type: "error"; text: string }
  | { type: "done" };

/** JSON lines may be split anywhere by the transport, including inside UTF-8. */
export async function readAssistantStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: AssistantEvent) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let completed = false;
  function consume(line: string) {
    if (!line.trim()) return;
    const event = JSON.parse(line) as AssistantEvent;
    if (event.type === "done") completed = true;
    onEvent(event);
  }
  try {
    for (;;) {
      const { done, value } = await reader.read();
      pending += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let end: number;
      while ((end = pending.indexOf("\n")) >= 0) {
        consume(pending.slice(0, end));
        pending = pending.slice(end + 1);
      }
      if (done) break;
    }
    consume(pending);
    if (!completed) throw new Error("The answer was interrupted. Please check again.");
  } finally {
    reader.releaseLock();
  }
}

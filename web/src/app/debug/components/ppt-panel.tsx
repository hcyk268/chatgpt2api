"use client";

import { EditableFilePanel } from "./editable-file-panel";

const defaultPrompt =
  "Create an 8-page Q2 2026 e-commerce operations deck for a leadership review: business-tech style, covering sales growth, user growth, ad performance, and 618 campaign results with line, bar, donut, and funnel charts.";

export function PptPanel() {
  return <EditableFilePanel title="PPT generation" kind="ppt" endpoint="/v1/ppt/generations" defaultPrompt={defaultPrompt} />;
}

"use client";

import { EditableFilePanel } from "./editable-file-panel";

const defaultPrompt =
  "Split poster elements by original positions into an editable PSD, keep background and layer positions, and export a zip of layer assets.";

export function PsdPanel() {
  return <EditableFilePanel title="PSD generation" kind="psd" endpoint="/v1/psd/generations" defaultPrompt={defaultPrompt} imageRequired />;
}

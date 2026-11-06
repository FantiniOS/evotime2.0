"use client";

import React from "react";
import { PDFViewer, pdf } from "@react-pdf/renderer";
import ScheduleVectorDocument, {
  ScheduleVectorDocumentProps,
} from "./ScheduleVectorDocument";

export async function generateAndDownloadOfficialPdf(
  props: ScheduleVectorDocumentProps,
  fileName: string
): Promise<void> {
  const blob = await pdf(<ScheduleVectorDocument {...props} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export default function VectorPdfClientStudio(
  props: ScheduleVectorDocumentProps
) {
  return (
    <div className="w-full h-full flex-1 rounded-xl overflow-hidden border border-slate-300 shadow-lg bg-slate-800">
      <PDFViewer width="100%" height="100%" showToolbar={true} className="w-full h-full border-0">
        <ScheduleVectorDocument {...props} />
      </PDFViewer>
    </div>
  );
}

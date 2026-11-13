/**
 * Export a DOM element to PDF using html2pdf (loaded on demand, same library the
 * customer ledger statement uses). The element is cloned into an offscreen wrapper
 * anchored at (0, 0) so html2canvas never clips the left side.
 * Falls back to the browser print dialog ("Save as PDF") if the library is unavailable.
 */
export async function exportElementToPdf(options: {
  elementId: string;
  filename: string;
  widthPx?: number;
  orientation?: "portrait" | "landscape";
}): Promise<void> {
  const { elementId, filename, widthPx = 1040, orientation = "landscape" } = options;
  const source = document.getElementById(elementId);
  if (!source) throw new Error("Report element not found");

  let wrapper: HTMLDivElement | null = null;
  try {
    const html2pdfLib =
      (window as any).html2pdf ||
      (await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
        script.onload = () => resolve((window as any).html2pdf);
        script.onerror = () => reject(new Error("Unable to load PDF library"));
        document.head.appendChild(script);
      }));

    const clone = source.cloneNode(true) as HTMLElement;
    clone.style.width = `${widthPx}px`;
    clone.style.minWidth = `${widthPx}px`;
    clone.style.maxWidth = `${widthPx}px`;
    clone.style.margin = "0";
    clone.style.boxShadow = "none";
    clone.style.background = "#ffffff";
    // Make hidden-on-mobile desktop tables visible inside the PDF clone
    clone.querySelectorAll<HTMLElement>("[data-pdf-show]").forEach((el) => {
      el.style.display = "block";
    });
    clone.querySelectorAll<HTMLElement>("[data-pdf-hide]").forEach((el) => {
      el.style.display = "none";
    });

    wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.top = "0";
    wrapper.style.left = "0";
    wrapper.style.width = `${widthPx}px`;
    wrapper.style.zIndex = "-9999";
    wrapper.style.pointerEvents = "none";
    wrapper.style.background = "#ffffff";
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    await html2pdfLib()
      .set({
        margin: [6, 6, 6, 6],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0, windowWidth: widthPx },
        jsPDF: { unit: "mm", format: "a4", orientation },
        pagebreak: { mode: ["css", "legacy"], avoid: "tr" },
      })
      .from(clone)
      .save();
  } catch (err) {
    console.warn("PDF generation fell back to print dialog:", err);
    window.print();
  } finally {
    if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
  }
}


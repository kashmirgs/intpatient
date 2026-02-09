import fitz  # PyMuPDF

from app.services.ocr import extract_text_from_image


async def extract_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from a PDF. Uses OCR for scanned (image-only) pages."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    all_text = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text().strip()

        if len(text) < 10:
            # Page has little or no text -- likely a scanned image.
            # Render page to an image and OCR it.
            pix = page.get_pixmap(dpi=300)
            image_bytes = pix.tobytes("png")
            text = await extract_text_from_image(image_bytes)

        if text:
            all_text.append(text)

    doc.close()
    return "\n\n".join(all_text)

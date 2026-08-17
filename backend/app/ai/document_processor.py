import io
import re
from typing import List, Dict, Any

try:
    from pypdf import PdfReader
except ImportError:
    class PdfReader:  # type: ignore
        def __init__(self, *args, **kwargs):
            raise ImportError("pypdf is not installed. Please install it inside the container using pip.")

class DocumentProcessor:
    @staticmethod
    def extract_text_from_pdf(pdf_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Extract text page-by-page from raw PDF bytes.
        Normalizes spacing inside paragraphs but preserves double newlines for paragraph boundaries.
        """
        try:
            pdf_file = io.BytesIO(pdf_bytes)
            reader = PdfReader(pdf_file)
            pages = []
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    # Clean up spacing inside paragraphs but retain paragraph double-newlines
                    normalized = re.sub(r'[ \t]+', ' ', page_text)
                    normalized = re.sub(r'\n\s*\n+', '\n\n', normalized).strip()
                    if normalized:
                        pages.append({
                            "page_number": i + 1,
                            "text": normalized
                        })
            
            # Sanity check: verify total extracted text across pages
            total_len = sum(len(p["text"]) for p in pages)
            if total_len < 50:
                raise ValueError(
                    "PDF contains little or no extractable text. "
                    "It may be scanned/image-based and require OCR."
                )
                
            return pages
        except Exception as e:
            if "require OCR" in str(e):
                raise
            raise ValueError(f"Failed to parse PDF document: {str(e)}")

    @staticmethod
    def extract_text(file_content: bytes, file_type: str) -> List[Dict[str, Any]]:
        """
        Extract text with page mapping based on the file extension / type.
        """
        clean_type = file_type.lower().strip(".")
        if clean_type == "pdf":
            return DocumentProcessor.extract_text_from_pdf(file_content)
        elif clean_type in ["txt", "md", "csv"]:
            try:
                raw_text = file_content.decode("utf-8")
            except UnicodeDecodeError:
                try:
                    raw_text = file_content.decode("latin-1")
                except Exception as e:
                    raise ValueError(f"Failed to decode text file: {str(e)}")
            
            # Preserve paragraphs
            normalized = re.sub(r'[ \t]+', ' ', raw_text)
            normalized = re.sub(r'\n\s*\n+', '\n\n', normalized).strip()
            
            if len(normalized) < 10:
                raise ValueError("File contains little or no text content.")
                
            return [{"page_number": 1, "text": normalized}]
        else:
            raise ValueError(f"Unsupported file type for extraction: {file_type}")

    @staticmethod
    def chunk_text(text: Any, chunk_size: int = 800, chunk_overlap: int = 150) -> List[Dict[str, Any]]:
        """
        Splits text (either a raw string or a list of page dicts) into overlapping chunks
        while preserving paragraph boundaries, and tracks page numbers (page_start, page_end).
        """
        if not text:
            return []

        if isinstance(text, str):
            pages = [{"page_number": 1, "text": text}]
        else:
            pages = text

        chunks = []
        chunk_idx = 0

        # Compile all text into a single running buffer while keeping track of character indices back to page numbers
        full_text_parts = []
        char_to_page = []  # mapping of char index in full_text to page number

        for page in pages:
            page_num = page["page_number"]
            page_text = page["text"]
            full_text_parts.append(page_text + "\n\n")  # add page separator
            for _ in range(len(page_text) + 2):
                char_to_page.append(page_num)

        full_text = "".join(full_text_parts).strip()
        if not full_text:
            return []

        text_len = len(full_text)
        start = 0

        while start < text_len:
            if start + chunk_size >= text_len:
                chunk_str = full_text[start:]
                end = text_len
                page_start = char_to_page[min(start, text_len - 1)]
                page_end = char_to_page[min(end - 1, text_len - 1)]
                chunks.append({
                    "text": chunk_str.strip(),
                    "chunk_index": chunk_idx,
                    "page_start": page_start,
                    "page_end": page_end
                })
                break

            end = start + chunk_size
            
            # Try to find a sentence boundary (., !, ?) or paragraph/newline boundary near the end of the chunk
            # search within the last 150 characters of the current chunk limit
            boundary = -1
            search_window = full_text[max(start, end - 150):end]
            
            # Look for double newlines (paragraphs) first
            para_match = list(re.finditer(r'\n\n', search_window))
            if para_match:
                boundary = para_match[-1].end()
            else:
                # Look for single newlines
                nl_match = list(re.finditer(r'\n', search_window))
                if nl_match:
                    boundary = nl_match[-1].end()
                else:
                    # Look for sentence endings
                    sent_match = list(re.finditer(r'[.!?]\s', search_window))
                    if sent_match:
                        boundary = sent_match[-1].end()

            if boundary != -1:
                end = max(start, end - 150) + boundary
            else:
                # Fall back to space boundary if no sentence ending found
                space_boundary = search_window.rfind(' ')
                if space_boundary != -1:
                    end = max(start, end - 150) + space_boundary + 1

            chunk_str = full_text[start:end].strip()
            if chunk_str:
                page_start = char_to_page[min(start, text_len - 1)]
                page_end = char_to_page[min(end - 1, text_len - 1)]
                chunks.append({
                    "text": chunk_str,
                    "chunk_index": chunk_idx,
                    "page_start": page_start,
                    "page_end": page_end
                })
                chunk_idx += 1

            start = max(start + 1, end - chunk_overlap)

        return chunks

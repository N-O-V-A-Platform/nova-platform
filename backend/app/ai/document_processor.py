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
    def extract_text_from_pdf(pdf_bytes: bytes) -> str:
        """
        Extract text content from raw PDF bytes.
        """
        try:
            pdf_file = io.BytesIO(pdf_bytes)
            reader = PdfReader(pdf_file)
            text_parts = []
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
            return "\n".join(text_parts)
        except Exception as e:
            raise ValueError(f"Failed to parse PDF document: {str(e)}")

    @staticmethod
    def extract_text(file_content: bytes, file_type: str) -> str:
        """
        Extract text based on the file extension / type.
        """
        clean_type = file_type.lower().strip(".")
        if clean_type == "pdf":
            return DocumentProcessor.extract_text_from_pdf(file_content)
        elif clean_type in ["txt", "md", "csv"]:
            try:
                return file_content.decode("utf-8")
            except UnicodeDecodeError:
                try:
                    return file_content.decode("latin-1")
                except Exception as e:
                    raise ValueError(f"Failed to decode text file: {str(e)}")
        else:
            raise ValueError(f"Unsupported file type for extraction: {file_type}")

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 800, chunk_overlap: int = 150) -> List[Dict[str, Any]]:
        """
        Splits text into overlapping chunks. Tries to split on paragraphs or sentences.
        Returns a list of dicts: {"text": chunk_text, "chunk_index": index}
        """
        if not text or not text.strip():
            return []

        # Replace consecutive whitespace/newlines for cleaner chunking
        normalized_text = re.sub(r'\s+', ' ', text).strip()
        
        chunks = []
        start = 0
        text_len = len(normalized_text)
        chunk_idx = 0

        while start < text_len:
            # If remaining text is smaller than chunk size, take it all
            if start + chunk_size >= text_len:
                chunk = normalized_text[start:]
                chunks.append({
                    "text": chunk,
                    "chunk_index": chunk_idx
                })
                break

            # Find end of chunk
            end = start + chunk_size
            
            # Try to find a sentence boundary (., !, ?) or space near the end of the chunk
            # search within the last 100 characters of the current chunk limit
            boundary = -1
            search_window = normalized_text[max(start, end - 100):end]
            
            # Look for sentence endings
            for match in re.finditer(r'[.!?]\s', search_window):
                boundary = max(boundary, match.end())
            
            if boundary != -1:
                # Adjust end to the boundary inside the search window
                end = max(start, end - 100) + boundary
            else:
                # Fall back to space boundary if no sentence ending found
                space_boundary = search_window.rfind(' ')
                if space_boundary != -1:
                    end = max(start, end - 100) + space_boundary + 1

            chunk = normalized_text[start:end].strip()
            if chunk:
                chunks.append({
                    "text": chunk,
                    "chunk_index": chunk_idx
                })
                chunk_idx += 1

            # Move start forward by chunk size minus overlap
            start = max(start + 1, end - chunk_overlap)

        return chunks

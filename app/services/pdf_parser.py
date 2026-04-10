import pdfplumber
from pathlib import Path


class PDFParser:
    """Service for extracting text from PDF resumes."""

    def extract_text(self, file_path: str) -> str:
        """Extract all text content from a PDF file."""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"PDF file not found: {file_path}")

        text_content = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_content.append(page_text)

        return "\n\n".join(text_content)

    def extract_text_with_metadata(self, file_path: str) -> dict:
        """Extract text and metadata from a PDF file."""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"PDF file not found: {file_path}")

        text_content = []
        with pdfplumber.open(file_path) as pdf:
            metadata = pdf.metadata or {}
            num_pages = len(pdf.pages)

            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_content.append(page_text)

        return {
            "text": "\n\n".join(text_content),
            "metadata": metadata,
            "num_pages": num_pages,
        }


pdf_parser = PDFParser()

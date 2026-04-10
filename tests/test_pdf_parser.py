import pytest
from app.services.pdf_parser import PDFParser


def test_pdf_parser_init():
    """Test PDF parser initialization."""
    parser = PDFParser()
    assert parser is not None


def test_extract_text_file_not_found():
    """Test that FileNotFoundError is raised for missing files."""
    parser = PDFParser()
    with pytest.raises(FileNotFoundError):
        parser.extract_text("/nonexistent/path.pdf")

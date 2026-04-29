import os
import logging
from typing import List, Dict, Any
from docling.document_converter import DocumentConverter

logger = logging.getLogger(__name__)

class DoclingExtractor:
    def __init__(self):
        # Initialize converter
        self.converter = DocumentConverter()

    def extract_layout(self, file_path: str) -> Dict[str, Any]:
        """
        Parses a PDF or DOCX and returns layout-aware extraction:
        - Full text
        - Blocks with bounding boxes
        - Tables
        - Page metadata
        """
        try:
            logger.info(f"Extracting layout from {file_path}")
            result = self.converter.convert(file_path)
            doc = result.document
            
            extraction = {
                "full_text": doc.export_to_markdown(),
                "blocks": [],
                "tables": [],
                "pages": []
            }
            
            # Extract pages metadata
            # In current docling version, we might need to explore how to get page info
            # For now, let's just get the blocks
            for i, item in enumerate(doc.texts):
                # docling texts are usually paragraphs or headings
                extraction["blocks"].append({
                    "text": item.text,
                    "page_no": item.prov[0].page_no if item.prov else 1,
                    "bbox": item.prov[0].bbox.as_tuple() if item.prov else (0,0,0,0),
                    "type": item.label.value if hasattr(item.label, 'value') else str(item.label)
                })

            for table in doc.tables:
                extraction["tables"].append({
                    "text": table.export_to_markdown(),
                    "page_no": table.prov[0].page_no if table.prov else 1,
                    "bbox": table.prov[0].bbox.as_tuple() if table.prov else (0,0,0,0)
                })
            
            return extraction
        except Exception as e:
            logger.error(f"Error extracting layout with Docling: {e}")
            raise

    def normalize_bbox(self, bbox: List[float], page_width: float, page_height: float) -> Dict[str, float]:
        """
        Normalizes bounding box coordinates to top-left system (0 to 1).
        """
        # x, y, w, h
        x, y, w, h = bbox
        return {
            "x": x / page_width,
            "y": y / page_height,
            "width": w / page_width,
            "height": h / page_height
        }

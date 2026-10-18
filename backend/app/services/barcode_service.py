import io
import logging
from typing import List, Dict, Any, Optional
from PIL import Image, ImageOps, ImageEnhance

logger = logging.getLogger(__name__)

# Try importing zxingcpp
try:
    import zxingcpp
    HAS_ZXING = True
except ImportError:
    HAS_ZXING = False
    logger.warning("zxingcpp is not installed. Barcode image decoding will be limited.")


def decode_barcode_from_image(image_bytes: bytes) -> List[Dict[str, Any]]:
    """
    Decodes 1D and 2D barcodes from raw image bytes.
    Supports EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, QR Code, Data Matrix, etc.
    Applies multi-pass image enhancement (original, grayscale, high-contrast) for maximum accuracy.
    """
    if not HAS_ZXING:
        return []

    try:
        base_img = Image.open(io.BytesIO(image_bytes))
    except Exception as e:
        logger.error(f"Failed to open image for barcode decoding: {e}")
        return []

    # Prepare passes: original, grayscale, contrast enhanced
    passes = [
        base_img,
        ImageOps.grayscale(base_img),
        ImageEnhance.Contrast(ImageOps.grayscale(base_img)).enhance(2.0),
        base_img.rotate(90, expand=True)  # In case rotated
    ]

    seen_barcodes = set()
    results: List[Dict[str, Any]] = []

    for img in passes:
        try:
            barcodes = zxingcpp.read_barcodes(img)
            for b in barcodes:
                text = (b.text or "").strip()
                if not text or text in seen_barcodes:
                    continue
                seen_barcodes.add(text)
                
                fmt_name = str(b.format)
                if hasattr(b.format, "name"):
                    fmt_name = b.format.name
                
                results.append({
                    "text": text,
                    "format": fmt_name,
                    "is_valid": b.is_valid if hasattr(b, "is_valid") else True,
                    "orientation": getattr(b, "orientation", 0)
                })
        except Exception as e:
            logger.debug(f"Error reading barcodes in pass: {e}")

        # If found in earlier pass, no need to keep enhancing
        if results:
            break

    return results

"""Quick test script to upload and verify a student document image.

Usage:
    python test_upload.py [image_path] [--first FIRST_NAME] [--last LAST_NAME] [--dept DEPARTMENT]

Examples:
    # Test with the default sample image:
    python test_upload.py

    # Test with your own uploaded image:
    python test_upload.py samples/my_card.jpg --first "Alex" --last "Morgan" --dept "Computer Science"
"""

import argparse
import json
import os
import sys
from fastapi.testclient import TestClient

from app.api.main import app


def main():
    parser = argparse.ArgumentParser(description="Test Back2Owner Document Verification")
    parser.add_argument(
        "image_path",
        nargs="?",
        default="samples/sample_student_id.jpg",
        help="Path to the document image file (default: samples/sample_student_id.jpg)",
    )
    parser.add_argument("--first", default="Alex", help="Student first name (default: Alex)")
    parser.add_argument("--last", default="Morgan", help="Student last name (default: Morgan)")
    parser.add_argument("--dept", default="Computer Science", help="Student department (default: Computer Science)")

    args = parser.parse_args()

    if not os.path.isfile(args.image_path):
        print(f"Error: File not found at '{args.image_path}'")
        print("Please place your test image in the 'samples/' folder or specify a valid file path.")
        sys.exit(1)

    print("=" * 60)
    print("BACK2OWNER STUDENT DOCUMENT VERIFICATION TEST")
    print("=" * 60)
    print(f"Image File : {args.image_path}")
    print(f"Student    : {args.first} {args.last}")
    print(f"Department : {args.dept}")
    print("-" * 60)
    print("Running verification...")

    client = TestClient(app)

    with open(args.image_path, "rb") as f:
        file_bytes = f.read()

    # Determine mime type
    ext = os.path.splitext(args.image_path)[1].lower()
    mime = "image/png" if ext == ".png" else "image/webp" if ext == ".webp" else "image/jpeg"

    response = client.post(
        "/api/v1/verify",
        files={"file": (os.path.basename(args.image_path), file_bytes, mime)},
        data={
            "first_name": args.first,
            "last_name": args.last,
            "department": args.dept,
        },
    )

    print(f"HTTP Status: {response.status_code}")
    print("-" * 60)

    try:
        data = response.json()
        print(f"Outcome         : {data.get('outcome', 'N/A').upper()}")
        print(f"Summary         : {data.get('summary_reason', 'N/A')}")
        print(f"Overall Conf    : {data.get('match_confidence', {}).get('overall_confidence', 'N/A')}%")
        print(f"Name Match      : {data.get('match_confidence', {}).get('name_score', 'N/A')}% (Is Match: {data.get('match_confidence', {}).get('name_is_match')})")
        print(f"Dept Match      : {data.get('match_confidence', {}).get('department_score', 'N/A')}% (Is Match: {data.get('match_confidence', {}).get('department_is_match')})")
        print(f"Quality Blur    : {data.get('quality', {}).get('blur_score')} (Blurry: {data.get('quality', {}).get('is_blurry')})")
        print(f"Quality Bright  : {data.get('quality', {}).get('brightness_score')} (Dark: {data.get('quality', {}).get('is_dark')})")
        print(f"Quality Crop    : Edge density {data.get('quality', {}).get('crop_edge_density')}")
        print(f"Extracted Lines : {data.get('extracted_fields', {}).get('line_count')}")
        print(f"Student Card KW : {data.get('extracted_fields', {}).get('student_document_keywords_found')}")
        print(f"Warnings        : {data.get('warnings')}")
        print(f"Next Steps      : {data.get('next_steps')}")
        print(f"Processing Time : {data.get('processing_time_ms')} ms")
        print("=" * 60)
        print("Full JSON Response:")
        print(json.dumps(data, indent=2))
    except Exception:
        print(response.text)


if __name__ == "__main__":
    main()

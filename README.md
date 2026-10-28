# Back2Owner Student Document Verification Service

A lightweight, production-conscious student document verification microservice built for **Back2Owner** using Python, FastAPI, OpenCV, and PaddleOCR.

The service receives an uploaded image of a student ID card alongside the student's submitted first name, last name, and department. It performs technical quality assessment, non-destructive preprocessing, optical character recognition (OCR), normalized fuzzy field matching, and evaluates a three-way decision outcome.

---

## 1. System Architecture & Flow

```mermaid
flowchart TD
    Client["Client / Frontend"] -->|POST /api/v1/verify\n(multipart/form-data)| API["FastAPI Route Handler"]
    
    subgraph Security_In_Memory["Security & In-Memory Handling"]
        API --> MagicCheck["Magic-Bytes & Size Validation"]
        MagicCheck --> MemDecode["In-Memory OpenCV Decode\n(Zero Disk Retention)"]
    end

    subgraph Quality_Assessment["Image Quality Assessment"]
        MemDecode --> Quality["ImageQualityAssessor"]
        Quality --> Blur["Laplacian Blur Variance"]
        Quality --> Brightness["Luminance & Contrast"]
        Quality --> Res["Resolution & Aspect Ratio"]
        Quality --> Crop["Boundary Edge Cutoff"]
    end

    subgraph Preprocessing_Pipeline["Non-Destructive Preprocessing"]
        MemDecode --> CopyImg["Image Clone (Original Preserved)"]
        CopyImg --> Prep["ImagePreprocessor"]
        Prep --> Bilateral["Bilateral Denoising"]
        Prep --> CLAHE["CLAHE Contrast Boost"]
        Prep --> Deskew["Deskew Rotation Correction"]
        Prep --> Upscale["Bicubic Upscaling"]
    end

    subgraph OCR_Engine["OCR Layer"]
        Prep --> Paddle["PaddleOCR Engine (PP-OCRv4)\nwith oneDNN CPU Patch"]
        Paddle --> TextTokens["Structured Text & Bounding Boxes"]
    end

    subgraph Field_Matching["Normalized Field Matching"]
        TextTokens --> Matcher["FieldMatcher (RapidFuzz)"]
        Matcher --> NameMatch["Name Permutation & Token Set Matching"]
        Matcher --> DeptMatch["Department Acronyms & Alias Dictionary"]
    end

    subgraph Decision_Engine["Decision Rules Engine"]
        Quality --> Decision["DecisionRulesEngine"]
        TextTokens --> Decision
        NameMatch --> Decision
        DeptMatch --> Decision
        Decision --> Output{"Outcome Determination"}
        Output -->|Quality OK + Match + Student Card| Passed["checks_passed"]
        Output -->|Blurry / Dark / Low-Res / Cropped| Retake["retake_required"]
        Output -->|Ambiguous / Mismatch / Non-Student Card| Review["manual_review"]
    end

    Passed --> Resp["JSON Structured Response"]
    Retake --> Resp
    Review --> Resp
```

---

## 2. Implemented Capabilities

| Capability | Module | Description |
| :--- | :--- | :--- |
| **Input Validation** | `app.security` | Validates magic bytes (`JPEG`, `PNG`, `WEBP`), file size limits (2 KB to 10 MB), and image dimensions ($\le 6000\text{px}$) to guard against decompression bombs. |
| **Quality Assessment** | `app.quality.assessor` | Assesses blur (variance of Laplacian $\sigma^2_{\nabla^2}$), brightness (mean luminance), contrast (standard deviation of luminance), resolution ($w, h$, megapixels), and cropping (border strip edge density). |
| **Non-Destructive Preprocessing** | `app.preprocessing.pipeline` | Enhances an in-memory clone for OCR without altering original evidence: applies edge-preserving bilateral filtering, CLAHE contrast equalization, automatic deskewing, and bicubic upscaling. |
| **PaddleOCR Text Extraction** | `app.ocr.paddle_engine` | Production singleton wrapper around PaddleOCR (`PP-OCRv4`) with an applied oneDNN runtime compatibility patch for 100% crash-free CPU inference on modern Python runtimes. |
| **Normalized Fuzzy Matching** | `app.matching` | Strips diacritics/accents, lowercases, handles token permutations ("Last First" vs "First Last"), middle names, initials ("A. Morgan"), and maps canonical departments to acronyms/aliases ("CS", "CSE", "Comp Sci" $\leftrightarrow$ "Computer Science"). |
| **Decision Rules** | `app.decision.rules` | Evaluates quality and match scores into one of three outcomes: `checks_passed`, `retake_required`, or `manual_review`. |
| **Privacy & PII Protection** | `app.security` | Zero disk persistence; in-memory decoding only; custom logging filter (`PIIRedactionFilter`) scrubs names, email addresses, and student IDs from logs. |

---

## 3. Important Verification Boundaries (Requirement 7)

> [!IMPORTANT]
> **What this service verifies:**
> - The uploaded image is of sufficient photographic quality to be read by OCR.
> - The document displays textual characteristics of a recognized collegiate credential.
> - The extracted student name and academic department match the registration claim within acceptable fuzzy matching thresholds.
>
> **What requires authoritative university integration or human review:**
> 1. **Active Enrollment Status:** A valid-looking student card does not confirm that the student is currently enrolled or in good standing for the current academic term. An authoritative university registrar API (or SIS integration) is required.
> 2. **Physical Document Authenticity:** Tamper-evident holograms, micro-printing, ultraviolet inks, and smart-card RFID chips cannot be authenticated through standard 2D smartphone photographs alone.
> 3. **Revocation / Expiration:** Student IDs that have been revoked, reissued, or expired require database verification.

---

## 4. Safe Handling of Ambiguity & Unreadable Images (Requirement 8)

> [!CAUTION]
> **Core Safety Principle:** Missing OCR text, low confidence, or credential mismatches are **NEVER** interpreted as proof of fraud or forgery.
>
> - **Technical Capture Failures** (blurry, dark, overexposed, low resolution, severely cropped, or 0 text tokens recognized):
>   - Outcome: `retake_required`
>   - Action: Returns constructive, empathetic capture guidance to the student (e.g., "Take the photo in a brightly lit environment", "Hold the camera steady").
> - **Credential Discrepancies or Non-Student Documents** (e.g., gym card, receipt, or name discrepancy):
>   - Outcome: `manual_review`
>   - Action: Routes to a human compliance specialist for manual verification without punitive fraud flags.

---

## 5. Decision Outcome Matrix

| Outcome | Trigger Conditions | Example Scenario |
| :--- | :--- | :--- |
| `checks_passed` | Quality metrics pass all thresholds; Name score $\ge 80\%$; Department score $\ge 75\%$; Student ID keywords detected. | Clear photo of student ID card matching "Alex Morgan" in "Computer Science". |
| `retake_required` | Blur score $< 90.0$; or Brightness $< 45$ or $> 230$; or Width $< 320\text{px}$; or Crop edge density $> 0.12$; or 0 tokens extracted. | Out-of-focus photo, dark room capture, or frame cutting off half the card. |
| `manual_review` | Quality is acceptable, but name score $< 80\%$, department score $< 75\%$, or document lacks university keywords. | Name typo/variation needing human review, or user uploaded a gym membership card. |

---

## 6. Setup and Installation

### Prerequisites
- Python 3.10+ (tested and verified on Python 3.13)
- Windows, Linux, or macOS

### Step 1: Clone and Set Up Virtual Environment
```bash
git clone <repository-url>
cd "Back2Owner ML"

python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate
```

### Step 2: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Configure Environment Variables (Optional)
Copy the example configuration file:
```bash
cp .env.example .env
```
All parameters have sensible production defaults and can be customized in `.env`.

### Step 4: Run the Service
```bash
uvicorn app.api.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive Swagger API documentation will be available at:
`http://localhost:8000/docs`

---

## 7. Running the Automated Test Suite

The test suite covers clear, blurry, dark, cropped, low-resolution, non-student documents, mismatched names, department aliases, input validation, and PII protection:

```bash
pytest
```

---

## 8. API Reference & Examples

### Endpoint: `POST /api/v1/verify`
Accepts `multipart/form-data`:
- `file`: Document image file (`.jpg`, `.jpeg`, `.png`, `.webp`)
- `first_name`: Student first name (string)
- `last_name`: Student last name (string)
- `department`: Academic department (string)

---

### Example 1: `checks_passed`

#### Request (cURL)
```bash
curl -X POST "http://localhost:8000/api/v1/verify" \
  -F "file=@student_id.jpg;type=image/jpeg" \
  -F "first_name=Alex" \
  -F "last_name=Morgan" \
  -F "department=Computer Science"
```

#### Response (200 OK)
```json
{
  "request_id": "4020ca98-3199-4d6f-87a3-e7a9b31d8e12",
  "outcome": "checks_passed",
  "summary_reason": "Document image quality and student credential details verified successfully.",
  "quality": {
    "blur_score": 182.4,
    "is_blurry": false,
    "brightness_score": 142.1,
    "is_dark": false,
    "is_overexposed": false,
    "contrast_score": 48.7,
    "is_low_contrast": false,
    "width": 800,
    "height": 500,
    "megapixels": 0.4,
    "is_low_resolution": false,
    "is_cropped": false,
    "crop_edge_density": 0.012,
    "is_acceptable_quality": true
  },
  "extracted_fields": {
    "raw_text": "METROPOLITAN UNIVERSITY\nSTUDENT IDENTITY CARD\nSTUDENT NAME: Alex Morgan\nDEPARTMENT: Computer Science\nSTUDENT ID: STU-2024-8831\nVALID THRU: 2028",
    "line_count": 6,
    "average_ocr_confidence": 0.975,
    "student_document_keywords_found": ["university", "student", "student id"],
    "is_student_document_suspected": true,
    "lines": [
      {"text": "METROPOLITAN UNIVERSITY", "confidence": 0.98},
      {"text": "STUDENT IDENTITY CARD", "confidence": 0.99},
      {"text": "STUDENT NAME: Alex Morgan", "confidence": 0.96},
      {"text": "DEPARTMENT: Computer Science", "confidence": 0.97}
    ]
  },
  "match_confidence": {
    "name_score": 95.24,
    "name_matched_text": "student name alex morgan",
    "name_match_method": "token_set",
    "name_is_match": true,
    "department_score": 100.0,
    "department_matched_text": "department computer science",
    "department_alias_used": null,
    "department_match_method": "token_subset_exact",
    "department_is_match": true,
    "overall_confidence": 97.24
  },
  "applied_preprocessing": [
    "bilateral_denoise",
    "clahe_contrast_enhancement",
    "bicubic_upscaling"
  ],
  "warnings": [],
  "next_steps": "Automated preliminary checks completed. Proceed to authoritative university enrollment verification.",
  "disclaimer": "Document visual and text checks passed. Note: This automated check verifies image legibility and detail correspondence only. Document authenticity and active student enrollment must be validated independently through an authoritative university database or registrar integration.",
  "processing_time_ms": 142.3
}
```

---

### Example 2: `retake_required` (Blurry / Dark)

#### Response (200 OK)
```json
{
  "request_id": "c138b31a-e692-498c-8cfd-4a1cf673e4a2",
  "outcome": "retake_required",
  "summary_reason": "Image capture quality is insufficient for verification: Image is blurry and text cannot be accurately resolved.",
  "quality": {
    "blur_score": 28.3,
    "is_blurry": true,
    "brightness_score": 115.0,
    "is_dark": false,
    "is_overexposed": false,
    "contrast_score": 38.2,
    "is_low_contrast": false,
    "width": 800,
    "height": 500,
    "megapixels": 0.4,
    "is_low_resolution": false,
    "is_cropped": false,
    "crop_edge_density": 0.008,
    "is_acceptable_quality": false
  },
  "extracted_fields": {
    "raw_text": "",
    "line_count": 0,
    "average_ocr_confidence": 0.0,
    "student_document_keywords_found": [],
    "is_student_document_suspected": false,
    "lines": []
  },
  "match_confidence": {
    "name_score": 0.0,
    "name_matched_text": "",
    "name_match_method": "none",
    "name_is_match": false,
    "department_score": 0.0,
    "department_matched_text": "",
    "department_alias_used": null,
    "department_match_method": "none",
    "department_is_match": false,
    "overall_confidence": 0.0
  },
  "applied_preprocessing": [],
  "warnings": [
    "Image is blurry (focus score: 28.3 < threshold 90.0)."
  ],
  "next_steps": "Please retake and upload a clearer photo. Suggestions: Hold the camera steady or place the document on a flat surface.",
  "disclaimer": "Document visual and text checks passed. Note: This automated check verifies image legibility and detail correspondence only. Document authenticity and active student enrollment must be validated independently through an authoritative university database or registrar integration.",
  "processing_time_ms": 18.6
}
```

---

### Example 3: `manual_review` (Mismatched Name / Unrelated Document)

#### Response (200 OK)
```json
{
  "request_id": "7820ad41-2a10-4491-b992-0bca8192a014",
  "outcome": "manual_review",
  "summary_reason": "Verification requires manual review: Student name did not match extracted document text (18.2% similarity).",
  "quality": {
    "blur_score": 175.8,
    "is_blurry": false,
    "brightness_score": 139.4,
    "is_dark": false,
    "is_overexposed": false,
    "contrast_score": 46.2,
    "is_low_contrast": false,
    "width": 800,
    "height": 500,
    "megapixels": 0.4,
    "is_low_resolution": false,
    "is_cropped": false,
    "crop_edge_density": 0.011,
    "is_acceptable_quality": true
  },
  "extracted_fields": {
    "raw_text": "METROPOLITAN UNIVERSITY\nSTUDENT IDENTITY CARD\nSTUDENT NAME: Sarah Connor\nDEPARTMENT: Mechanical Engineering",
    "line_count": 4,
    "average_ocr_confidence": 0.97,
    "student_document_keywords_found": ["university", "student", "student id"],
    "is_student_document_suspected": true,
    "lines": [
      {"text": "METROPOLITAN UNIVERSITY", "confidence": 0.98},
      {"text": "STUDENT NAME: Sarah Connor", "confidence": 0.96}
    ]
  },
  "match_confidence": {
    "name_score": 18.18,
    "name_matched_text": "student name sarah connor",
    "name_match_method": "token_sort",
    "name_is_match": false,
    "department_score": 25.0,
    "department_matched_text": "department mechanical engineering",
    "department_alias_used": null,
    "department_match_method": "token_set",
    "department_is_match": false,
    "overall_confidence": 32.4
  },
  "applied_preprocessing": [
    "bilateral_denoise",
    "clahe_contrast_enhancement",
    "bicubic_upscaling"
  ],
  "warnings": [],
  "next_steps": "This document has been routed to the Back2Owner manual review queue. A verification specialist will review the submitted evidence alongside university records.",
  "disclaimer": "Document visual and text checks passed. Note: This automated check verifies image legibility and detail correspondence only. Document authenticity and active student enrollment must be validated independently through an authoritative university database or registrar integration.",
  "processing_time_ms": 115.8
}
```

---

## 9. Data Protection & Privacy Architecture

In accordance with strict PII handling standards:
1. **Zero Retention on Disk**: All image decoding (`cv2.imdecode`) and preprocessing happen entirely in volatile memory buffers (`RAM`). Images are dereferenced and garbage collected immediately after request completion.
2. **PII Masking Filter in Logs**: Student names are masked (`Alex Morgan` $\rightarrow$ `A*** M***`), and sensitive ID patterns (`STU-2024-8831` $\rightarrow$ `[REDACTED_ID]`) or email addresses are scrubbed from log streams.
3. **No Public Storage**: The service does not host uploaded files in static directories or create public media URLs.

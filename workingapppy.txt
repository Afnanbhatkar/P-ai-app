# app.py
import os
import json
import random
import time
import pathlib
import webbrowser
import re
import html
from time import sleep
from flask import Flask, request, jsonify, make_response, abort
from flask_cors import CORS

# Firebase admin
import firebase_admin
from firebase_admin import credentials, firestore, auth

# Selenium & scraping
from selenium import webdriver
from selenium.common.exceptions import (
    NoSuchElementException,
    TimeoutException,
    StaleElementReferenceException,
)
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# Other helpers
from googlesearch import search
import wikipedia

ScriptDir = pathlib.Path().absolute()

# ------------------ CONFIG ------------------
# Path to your Firebase Admin SDK JSON file (update to your actual path)
FIREBASE_CRED_PATH = os.path.join("frontend", "src", "firebase-adminsdk.json")

# Chromedriver path (unused if using webdriver_manager, but keep for fallback)
CHROMEDRIVER_PATH = str(pathlib.Path(r"chromedriver/chromedriver.exe"))

# Remote debugging address (if you want to attach to a running Chrome)
CHROME_DEBUGGER_ADDRESS = "127.0.0.1:9222"

# Where to store per-user chats (folder)
USER_CHATS_DIR = os.path.join(ScriptDir, "user_chats")
os.makedirs(USER_CHATS_DIR, exist_ok=True)

# Global conversation archive
CONVERSATIONS_FILE = os.path.join(ScriptDir, "conversations.txt")

# ------------------ FIREBASE ADMIN INITIALIZATION ------------------
if not os.path.exists(FIREBASE_CRED_PATH):
    raise FileNotFoundError(f"Firebase admin key not found at: {FIREBASE_CRED_PATH}")

cred = credentials.Certificate(FIREBASE_CRED_PATH)
firebase_admin.initialize_app(cred)
db = firestore.client()

# ------------------ SELENIUM (PIAI / DeepAI) ------------------
driver = None

try:
    chrome_options = Options()
    chrome_options.add_experimental_option("debuggerAddress", CHROME_DEBUGGER_ADDRESS)
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    # attempt to go to preferred site
    driver.get("https://deepai.org/chat/chatgpt-alternative")
    print("Connected to existing Chrome (remote-debugging) -> PIAI ready.")
except Exception as e_remote:
    print("Could not attach to remote-debugging Chrome:", e_remote)
    # Fallback to launching chromedriver directly
    try:
        print("Launching new Chrome via chromedriver...")
        chrome_options = Options()
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        # default to DeepAI if PIAI blocks direct automation
        driver.get("https://deepai.org/chat/chatgpt-alternative")
        print("Launched Chrome via chromedriver -> ready.")
    except Exception as e_cd:
        print("Failed to initialize Selenium driver. Scraping will be unavailable.")
        print("Chromedriver/Chrome error:", e_cd)
        driver = None

# ------------------ INTENTS (trimmed example) ------------------
data = {
    "intents": [
        {"tag": "google_search", "patterns": ["search for", "google search", "look up", "where is", "what is"], "responses": ["Let me find that for you..."]},
        {"tag": "joke", "patterns": ["tell me a joke"], "responses": ["Why did the computer keep its drink on the windowsill? Because it wanted a cold drink! 😄"]},
        {"tag": "show_website", "patterns": ["show my website", "display my website"], "responses": ["Sure, here is your website:"], "attachments": [{"type":"website","url":"https://yourwebsite.com","title":"Visit Your Website"}]}
    ]
}
responses = {intent['tag']: intent.get('responses', []) for intent in data['intents']}

# ------------------ USER CHAT STORAGE ------------------
def user_chat_file(uid):
    safe_uid = str(uid).replace("/", "_")
    return os.path.join(USER_CHATS_DIR, f"chats_{safe_uid}.json")

def load_chats_for_user(uid):
    path = user_chat_file(uid)
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            s = f.read().strip()
            if not s:
                return []
            return json.loads(s)
    except Exception as e:
        print(f"User chats file corrupted for {uid}! Resetting. ({e})")
        return []

def save_chats_for_user(uid, chats):
    try:
        with open(user_chat_file(uid), "w", encoding="utf-8") as f:
            json.dump(chats, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Failed to save chats for {uid}: {e}")

def create_new_chat_for_user(uid, first_message="New Chat"):
    chats = load_chats_for_user(uid)
    chat_id = 1 if len(chats) == 0 else (max((c.get("id", 0) for c in chats)) + 1)
    title = first_message.strip()
    if len(title) > 40:
        title = title[:37] + "..."
    if not title or title.lower() in ["hi", "hello", "hey", "jarvis", "new chat"]:
        title = f"Chat {chat_id}"
    new_chat = {"id": chat_id, "title": title, "messages": [{"role": "user", "content": first_message}]}
    chats.append(new_chat)
    save_chats_for_user(uid, chats)
    return new_chat

def add_message_to_chat_for_user(uid, chat_id, role, content):
    try:
        chat_id = int(chat_id)
    except Exception:
        return None
    chats = load_chats_for_user(uid)
    for chat in chats:
        if chat.get("id") == chat_id:
            chat.setdefault("messages", []).append({"role": role, "content": content})
            if len(chat.get("messages", [])) == 2 and role == "assistant":
                first_user_msg = chat["messages"][0]["content"]
                new_title = first_user_msg.strip()
                if len(new_title) > 40:
                    new_title = new_title[:37] + "..."
                if new_title and new_title.lower() not in ["hi", "hello", "hey", "jarvis"]:
                    chat["title"] = new_title
            save_chats_for_user(uid, chats)
            return chat
    return None

def save_conversation(user_query, response):
    try:
        with open(CONVERSATIONS_FILE, "a", encoding="utf-8") as file:
            file.write(f"User: {user_query}\n")
            file.write(f"AI: {response}\n\n")
    except Exception as e:
        print("Failed to append to conversations file:", e)

# ------------------ SELENIUM SEND HELPER ------------------
# Use Selenium to send the query and scrape reply
def send_message_to_piai(query):
    """
    NOTE: Adjust XPATHs below if the target page changes.
    This implementation targets the deepai.org chat input layout.
    """
    # Example XPATHs used previously — keep as-is but adapt when site updates
    try:
        x_path = "/html/body/div[2]/main/div[9]/textarea"
        el = driver.find_element(by=By.XPATH, value=x_path)
        el.clear()
        el.send_keys(query)
        sleep(0.3)
        x_path2 = "/html/body/div[2]/main/div[9]/div/div/button[3]"
        driver.find_element(by=By.XPATH, value=x_path2).click()
        # short wait to let site commence streaming
        sleep(0.6)
    except Exception as e:
        # if specific xpath fails, try a generic fallback: textarea anywhere
        try:
            txt = driver.find_element(By.TAG_NAME, "textarea")
            txt.clear()
            txt.send_keys(query)
            btns = driver.find_elements(By.XPATH, "//button")
            # click last visible button as fallback
            if btns:
                btns[-1].click()
            sleep(0.6)
        except Exception as ex:
            raise RuntimeError(f"Failed to send message to PIAI: {e} / fallback: {ex}")

# ------------------ High-level formatting detector & code detection ------------------
FENCED_CODE_RE = re.compile(
    r"(?P<fence>```+)\s*(?P<lang>[a-zA-Z0-9+\-]*)\s*\n(?P<body>.*?)(?P=fence)",
    re.DOTALL
)

def is_mostly_code(text: str, threshold: float = 0.6) -> bool:
    """Heuristic to decide if a block is mostly code (keeps code verbatim)."""
    if not text or not isinstance(text, str):
        return False
    # Quick positive: fenced code block present
    if FENCED_CODE_RE.search(text):
        return True

    lines = [ln for ln in text.splitlines() if ln.strip()]
    if not lines:
        return False

    code_like = 0
    for ln in lines:
        ln_strip = ln.strip()
        signs = 0
        # common code starts / tokens
        if ln_strip.startswith(("def ", "class ", "function ", "const ", "let ", "var ", "import ", "from ", "export ")):
            signs += 1
        if ln_strip.endswith(";"):
            signs += 1
        if re.search(r"\breturn\b|\bif\b|\belse\b|\bfor\b|\bwhile\b|\bswitch\b|\bcase\b", ln_strip):
            signs += 1
        if re.search(r"[{}=><()\[\];]", ln_strip):
            signs += 1
        if "=>" in ln_strip or "->" in ln_strip:
            signs += 1
        if re.match(r"^( {4,}|\t+)\S", ln):  # indentation
            signs += 1
        # common short patterns like "const x ="
        if re.search(r"\b(const|let|var|function|class)\b", ln_strip):
            signs += 1
        # html tag line
        if re.match(r"^\s*<\w+", ln_strip):
            signs += 1
        # function call style short lines like "foo(bar);"
        if re.search(r"^\w+\(.*\)\s*;?$", ln_strip) and len(ln_strip.split()) <= 6:
            signs += 1

        if signs >= 1:
            code_like += 1

    ratio = code_like / len(lines)
    return ratio >= threshold

POINT_REQUEST_KEYWORDS = [
    "list", "points", "bullet", "bullets", "summarize", "summary",
    "give 5", "give 3", "steps", "step-by-step", "step by step", "advantages",
    "disadvantages", "pros and cons", "key points", "important points", "outline",
    "in points", "write points", "write in points", "pointwise", "point wise"
]

LETTER_CUES = [
    r'(^|\n)\s*Subject\s*:',    # Subject:
    r'(^|\n)\s*Dear\s+[A-Za-z]', # Dear Name,
    r'(^|\n)\s*Sincerely[,\\s]*',# Sincerely
    r'(^|\n)\s*Regards[,\\s]*',  # Regards
    r'(^|\n)\s*Yours\s+(sincerely|truly)[,\\s]*', # Yours sincerely / Yours truly
    r'(^|\n)\s*To\s*:',         # To:
    r'(^|\n)\s*From\s*:',       # From:
    r'(^|\n)\s*Respected\s+Sir', # Respected Sir / Madam
]

def user_requested_points(user_query: str) -> bool:
    """Return True if user query explicitly asks for points/lists/steps etc."""
    if not user_query:
        return False
    q = user_query.lower()
    if any(kw in q for kw in POINT_REQUEST_KEYWORDS):
        return True
    if re.search(r'\b(give|show|list|write|tell)\b.*\b(points|steps|bullets|summary|outline)\b', q):
        return True
    return False

def looks_like_letter(text: str) -> bool:
    """Detect if scraped text is a letter / formal message that should be kept whole."""
    if not text or not text.strip():
        return False
    for cue in LETTER_CUES:
        if re.search(cue, text, re.IGNORECASE):
            return True
    return False

def raw_text_should_be_points(raw: str) -> bool:
    """
    Heuristic: return True if raw content looks like it should be formatted into points.
    Avoid treating code-like blocks as points.
    """
    if not raw or not raw.strip():
        return False

    # If it's code-like, don't format
    if is_mostly_code(raw):
        return False

    # If it already contains numbered/bulleted structure -> format
    if re.search(r'(^|\n)\s*\d+[\).\:\-]\s+', raw) or re.search(r'(^|\n)\s*[\-\u2022\*]\s+', raw):
        return True

    lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
    if len(lines) >= 3:
        avg_words = sum(len(ln.split()) for ln in lines) / len(lines)
        short_lines = sum(1 for ln in lines if len(ln.split()) <= 10)
        if short_lines / len(lines) >= 0.6 and avg_words <= 12:
            return True

    colon_lines = sum(1 for ln in lines if ln.rstrip().endswith(':'))
    if colon_lines >= 2:
        return True

    return False

def should_format_as_points(user_query: str, raw: str) -> bool:
    """
    Decide whether to turn the raw scraped text into numbered points.

    Rules:
    - If user explicitly asked for points -> True
    - If raw looks like a letter -> False
    - If raw is code-heavy or contains fenced code -> False
    - Otherwise only format if raw_text_should_be_points(raw) says so
    """
    user_query = (user_query or "") if not isinstance(user_query, str) else user_query
    raw = (raw or "") if not isinstance(raw, str) else raw

    if user_requested_points(user_query):
        return True

    if looks_like_letter(raw):
        return False

    try:
        has_fence = bool(FENCED_CODE_RE.search(raw)) if isinstance(raw, str) else False
        if is_mostly_code(raw) or has_fence:
            return False
    except Exception:
        return False

    return raw_text_should_be_points(raw)


# ------------------ Table detection / parsing / rendering helpers ------------------
def looks_like_table_text(raw: str) -> bool:
    """Quick heuristic — True if raw text probably contains a table."""
    if not raw or not raw.strip():
        return False
    s = raw.strip()
    # obvious markers
    if "|" in s and ("\n" in s):
        return True
    if "\t" in s:
        return True
    # many lines and many commas => CSV-like
    lines = [ln for ln in raw.splitlines() if ln.strip()]
    if len(lines) >= 2:
        comma_counts = [ln.count(",") for ln in lines if ln.strip()]
        if len(comma_counts) >= 2 and max(comma_counts) > 0 and (min(comma_counts) == max(comma_counts)):
            return True
    # repeated multi-space separators (aligned columns)
    multi_space_lines = sum(1 for ln in lines if re.search(r"\s{2,}", ln))
    if multi_space_lines >= max(2, len(lines)//2):
        return True
    return False

def parse_table_from_text(raw: str) -> list:
    """
    Return rows: List[List[str]] or [] if no table parsed.
    Heuristics:
      1) If pipe-separated -> split on '|' ignoring leading/trailing empty cells
      2) Else if tab-separated -> split on '\t'
      3) Else if CSV-like -> split on commas (simple)
      4) Else if multi-space aligned -> split on 2+ spaces
    """
    rows = []
    lines = [ln.rstrip() for ln in raw.splitlines() if ln.strip()]

    if not lines:
        return []

    # 1) Pipe markdown-ish table
    if any("|" in ln for ln in lines):
        for ln in lines:
            # skip separator lines like | --- | --- |
            if re.match(r'^\s*\|?\s*[:-]+\s*(\|\s*[:-]+\s*)+\|?\s*$', ln):
                continue
            parts = [p.strip() for p in ln.split("|")]
            # drop empty leading/trailing if line started/ended with pipe
            if parts and parts[0] == "":
                parts = parts[1:]
            if parts and parts[-1] == "":
                parts = parts[:-1]
            if parts:
                rows.append(parts)
        if len(rows) >= 1:
            maxcols = max(len(r) for r in rows)
            rows = [r + [""]*(maxcols-len(r)) for r in rows]
            return rows

    # 2) Tab-separated
    if any("\t" in ln for ln in lines):
        for ln in lines:
            parts = [p.strip() for p in ln.split("\t")]
            rows.append(parts)
        maxcols = max(len(r) for r in rows)
        rows = [r + [""]*(maxcols-len(r)) for r in rows]
        return rows

    # 3) Comma-separated (CSV-like) only if counts mostly consistent
    comma_counts = [ln.count(",") for ln in lines]
    if len(comma_counts) >= 2 and max(comma_counts) > 0:
        mode_count = max(set(comma_counts), key=comma_counts.count)
        if sum(1 for c in comma_counts if c == mode_count) >= max(1, len(comma_counts)//2):
            for ln in lines:
                parts = [p.strip() for p in ln.split(",")]
                rows.append(parts)
            maxcols = max(len(r) for r in rows)
            rows = [r + [""]*(maxcols-len(r)) for r in rows]
            return rows

    # 4) Multi-space aligned (split on 2+ spaces)
    if sum(1 for ln in lines if re.search(r"\s{2,}", ln)) >= 2:
        for ln in lines:
            parts = [p.strip() for p in re.split(r'\s{2,}', ln) if p.strip() != ""]
            if parts:
                rows.append(parts)
        if rows:
            maxcols = max(len(r) for r in rows)
            rows = [r + [""]*(maxcols-len(r)) for r in rows]
            return rows

    return []

def escape_pipe_md(cell: str) -> str:
    """Escape pipes in markdown table cells."""
    if cell is None:
        return ""
    return str(cell).replace("|", "\\|").strip()

def rows_to_markdown_table(rows: list) -> str:
    """
    Convert rows -> markdown table string.
    Uses first row as header when there are at least 2 rows.
    """
    if not rows:
        return ""

    rows = [[escape_pipe_md(str(c)) for c in r] for r in rows]

    if len(rows) == 1:
        header = rows[0]
        sep = ["---"] * len(header)
        md = "| " + " | ".join(header) + " |\n"
        md += "| " + " | ".join(sep) + " |\n"
        return md

    header = rows[0]
    body = rows[1:]
    sep = ["---"] * len(header)
    lines = []
    lines.append("| " + " | ".join(header) + " |")
    lines.append("| " + " | ".join(sep) + " |")
    for r in body:
        lines.append("| " + " | ".join(r) + " |")
    return "\n".join(lines)

def rows_to_html_table(rows: list) -> str:
    """Return a minimal HTML table string (escaped)."""
    if not rows:
        return ""
    out = ['<table border="1" cellpadding="6" cellspacing="0">']
    if len(rows) > 1:
        out.append("  <thead>")
        out.append("    <tr>")
        for h in rows[0]:
            out.append("      <th>{}</th>".format(html.escape(str(h))))
        out.append("    </tr>")
        out.append("  </thead>")
        out.append("  <tbody>")
        for r in rows[1:]:
            out.append("    <tr>")
            for c in r:
                out.append("      <td>{}</td>".format(html.escape(str(c))))
            out.append("    </tr>")
        out.append("  </tbody>")
    else:
        out.append("  <tbody>")
        out.append("    <tr>")
        for c in rows[0]:
            out.append("      <td>{}</td>".format(html.escape(str(c))))
        out.append("    </tr>")
        out.append("  </tbody>")
    out.append("</table>")
    return "\n".join(out)

def should_return_table(user_query: str, raw: str) -> bool:
    """
    Decide whether to return a table:
      - If user explicitly asked for a table/csv -> True
      - Else if content looks like a table and not a letter or code -> True
    """
    q = (user_query or "").lower() if isinstance(user_query, str) else ""
    if any(k in q for k in ["table", "tabular", "csv", "as table", "format as table"]):
        return True
    if looks_like_letter(raw):
        return False
    if is_mostly_code(raw) or FENCED_CODE_RE.search(raw):
        return False
    return looks_like_table_text(raw)


# ------------------ Post-processing helpers (split & format) ------------------
def _split_into_points(text):
    """
    Heuristic splitter with letter-detection.
    - If the text looks like a letter/email (Dear, Subject:, Sincerely, Regards, To:, From:, etc.)
      return the whole text as a single block (preserve formatting).
    - Otherwise behave as before: try numbered/bullets, paragraphs, heading+description grouping,
      or line/sentence splitting as fallback.
    """
    if not text or not text.strip():
        return []

    t = text.strip()

    # --- LETTER / FORMAL-MESSAGE DETECTION ---
    letter_cues = [
        r'(^|\n)\s*Subject\s*:',    # Subject:
        r'(^|\n)\s*Dear\s+[A-Za-z]', # Dear Name,
        r'(^|\n)\s*Sincerely[,\\s]*',# Sincerely
        r'(^|\n)\s*Regards[,\\s]*',  # Regards
        r'(^|\n)\s*Yours\s+(sincerely|truly)[,\\s]*', # Yours sincerely / Yours truly
        r'(^|\n)\s*To\s*:',         # To:
        r'(^|\n)\s*From\s*:',       # From:
        r'(^|\n)\s*Respected\s+Sir', # Respected Sir / Madam
    ]
    for cue in letter_cues:
        if re.search(cue, t, re.IGNORECASE):
            # It's a letter — return as single block preserving newlines.
            return [t]

    # --- existing heuristics below (kept, with improvements for headings + description) ---
    numbered_pattern = re.compile(r'^\s*\d+[\).\:\-]\s+', re.MULTILINE)
    bullet_pattern = re.compile(r'^\s*[\-\u2022\*]\s+', re.MULTILINE)

    # 1) If explicit numbered items present -> split there
    if numbered_pattern.search(t):
        parts = re.split(r'(?m)(?=\s*\d+[\).\:\-]\s+)', t)
        points = []
        for p in parts:
            p = p.strip()
            if not p:
                continue
            p = re.sub(r'^\s*\d+[\).\:\-]\s*', '', p).strip()
            if p:
                points.append(p)
        if points:
            return points

    # 2) If bullets present -> split by bullet
    if bullet_pattern.search(t):
        parts = re.split(r'(?m)^\s*[\-\u2022\*]\s+', t)
        points = [p.strip() for p in parts if p.strip()]
        if points:
            return points

    # 3) Paragraphs (double newline)
    paras = [p for p in re.split(r'\n\s*\n', t)]
    paras = [p.strip() for p in paras if p.strip()]
    if len(paras) >= 2:
        return paras

    # 4) Single paragraph with multiple visual lines -> try heading+description grouping
    if '\n' in t:
        raw_lines = [ln for ln in t.splitlines()]
        visible = [ln.rstrip() for ln in raw_lines if ln.strip() != ""]
        grouped = []
        i = 0
        while i < len(visible):
            cur = visible[i].strip()
            nxt = visible[i+1].strip() if i + 1 < len(visible) else None

            # a) cur ends with ':' -> combine with next
            if nxt and cur.endswith(':'):
                combined = f"{cur} {nxt}"
                grouped.append(combined.strip())
                i += 2
                continue

            # b) short heading (<=6 words) + longer next line -> combine
            cur_words = len(cur.split())
            nxt_words = len(nxt.split()) if nxt else 0
            if nxt and cur_words <= 6 and nxt_words >= max(4, cur_words + 3):
                combined = f"{cur} {nxt}"
                grouped.append(combined.strip())
                i += 2
                continue

            # c) next line looks like continuation (starts lowercase or punctuation) -> combine
            if nxt and cur_words <= 8 and re.match(r'^[a-z0-9\(\[\{\-]', nxt.strip()):
                combined = f"{cur} {nxt}"
                grouped.append(combined.strip())
                i += 2
                continue

            grouped.append(cur)
            i += 1

        if len(grouped) >= 2:
            return grouped

        lines_out = [ln.strip() for ln in visible if ln.strip()]
        if len(lines_out) >= 2:
            return lines_out

    # 5) Last resort: sentence splitting
    sentences = re.split(r'(?<=[\.\?\!])\s+(?=[A-Z0-9])', t)
    cleaned = [s.strip() for s in sentences if s.strip()]
    if len(cleaned) == 0:
        return [t.strip()]
    if len(cleaned) > 20:
        grouped = []
        buf = []
        for i, s in enumerate(cleaned):
            buf.append(s)
            if (i + 1) % 2 == 0:
                grouped.append(" ".join(buf))
                buf = []
        if buf:
            grouped.append(" ".join(buf))
        return grouped
    return cleaned

def _format_numbered(points):
    """
    Format list of points -> nicely numbered text with consistent spacing.
    Returns single string.
    """
    out_lines = []
    for i, p in enumerate(points, start=1):
        p_clean = p.strip()
        p_clean = re.sub(r'^[\-\u2022\*]\s*', '', p_clean)
        out_lines.append(f"{i}. {p_clean}")
    return "\n\n".join(out_lines)

# ------------------ Robust scraper + formatter ------------------
# ------------------ Helper: determine last existing reply index ------------------
def _detect_last_existing_div_index(max_check=200):
    """
    Scan even div indices (2,4,6,...) up to max_check and return the highest index
    that currently exists and contains text. If none found, returns 0.
    This is used so we only consider replies that appear after the current last index.
    """
    last_idx = 0
    for i in range(2, min(max_check, 200) + 1, 2):
        xp = f"/html/body/div[2]/main/form/div[{i}]/div[1]"
        try:
            els = driver.find_elements(By.XPATH, xp)
            found = False
            for el in els:
                try:
                    if (el.text or "").strip():
                        found = True
                        break
                except Exception:
                    continue
            if found:
                last_idx = i
            else:
                continue
        except Exception:
            continue
    return last_idx

# ------------------ Simple scanner used as fallback (now accepts start_index & max_index) ------------------
def scrape_results_from_piai_simple(start_index=0, max_index=200):
    """
    Simple, reliable scanner:
    Probe /html/body/div[2]/main/form/div[start_index+2], div[start_index+4], ...
    up to max_index and return the last non-empty div found that is AFTER start_index.
    """
    sleep(1)

    last_text = None
    last_found_idx = None

    first = start_index + 2 if start_index >= 2 else 2
    for i in range(first, min(max_index, 200) + 1, 2):
        xp = f"/html/body/div[2]/main/form/div[{i}]/div[1]"
        try:
            els = driver.find_elements(By.XPATH, xp)
            found_any = False
            for el in els:
                try:
                    txt = (el.text or "").strip()
                    if txt:
                        last_text = txt
                        last_found_idx = i
                        found_any = True
                except Exception:
                    continue
        except NoSuchElementException:
            break
        except Exception:
            continue

    if last_text is None:
        sleep(1)
        for i in range(first, min(max_index, 200) + 1, 2):
            xp = f"/html/body/div[2]/main/form/div[{i}]/div[1]"
            try:
                els = driver.find_elements(By.XPATH, xp)
                for el in els:
                    try:
                        txt = (el.text or "").strip()
                        if txt:
                            last_text = txt
                            last_found_idx = i
                    except Exception:
                        continue
            except Exception:
                continue

    sleep(0.5)
    return last_text or ""

# ------------------ Robust scraper + formatter (updated: avoid reading old divs) ------------------
def scrape_and_number_from_piai(timeout=25, stable_ms=1200, poll_ms=300, return_list=False, max_index=200, user_query: str = None):
    """
    FAST VERSION:
    - Determine start_index to avoid old cached divs
    - Run JS watcher -> fallback scanner
    - Decide whether to format into numbered points based on `user_query` and raw text shape
    - If the raw is detected as a table, return it as a Markdown table (or rows when return_list=True)
    """
    if driver is None:
        fallback = "DeepAI/PIAI unavailable (Selenium driver not connected)."
        if return_list:
            return fallback, []
        return fallback

    start_index = 0
    try:
        start_index = _detect_last_existing_div_index(max_check=max_index)
    except Exception:
        start_index = 0

    raw = ""
    try:
        js = """
        const startIndex = arguments[0];
        const maxIndex = arguments[1];
        const stableMs = arguments[2];
        const pollMs = arguments[3];
        const timeoutMs = arguments[4];
        const done = arguments[arguments.length - 1];
        function xpathText(xp){
          try{
            const rs = document.evaluate(xp, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            const parts = [];
            for(let i=0;i<rs.snapshotLength;i++){
              const el = rs.snapshotItem(i);
              if(!el) continue;
              const t = (el.innerText || '').trim();
              if(t) parts.push(t);
            }
            return parts.join("\\n");
          }catch(e){
            return '';
          }
        }
        function buildCombined(){
          const seen = new Set();
          const blocks = [];
          const start = Math.max(2, startIndex + 2);
          const cap = Math.min(200, maxIndex || 200);
          for(let i = start; i <= cap; i += 2){
            const xp = `/html/body/div[2]/main/form/div[${i}]/div[1]`;
            let txt = xpathText(xp);
            if(!txt) continue;
            const paras = txt.split(/\\n+/).map(s=>s.trim()).filter(Boolean);
            const keep = [];
            for(const p of paras){
              if(!seen.has(p)){
                seen.add(p);
                keep.push(p);
              }
            }
            if(keep.length) blocks.push(keep.join("\\n"));
          }
          return blocks.join("\\n\\n");
        }
        const obs = new MutationObserver(()=>{ lastChange = performance.now(); });
        obs.observe(document, { childList:true, subtree:true, characterData:true });
        let lastCombined = '';
        let lastChange = performance.now();
        const startTime = performance.now();
        const interval = setInterval(()=>{
          const now = performance.now();
          if(now - startTime > timeoutMs){
            clearInterval(interval);
            obs.disconnect();
            return done(lastCombined || "");
          }
          const combined = buildCombined();
          if(combined.length > lastCombined.length + 5 || (combined !== lastCombined && combined.length > 20)){
            lastCombined = combined;
            lastChange = performance.now();
          }
          if(lastCombined && (performance.now() - lastChange) >= stableMs){
            clearInterval(interval);
            obs.disconnect();
            return done(lastCombined);
          }
        }, pollMs);
        """
        raw = driver.execute_async_script(js, start_index, max_index, stable_ms, poll_ms, int(timeout * 1000))
        if raw and isinstance(raw, str):
            raw = raw.strip()
        else:
            raw = ""
    except Exception:
        raw = ""

    if not raw:
        raw = scrape_results_from_piai_simple(start_index=start_index, max_index=max_index)

    if not raw:
        final_text = "Could not scrape final response (timeout/no content)."
        if return_list:
            return final_text, []
        return final_text

    # --- TABLE HANDLING: detect & parse before any point-formatting ---
    try:
        if should_return_table(user_query or "", raw):
            rows = parse_table_from_text(raw)
            if rows:
                md_table = rows_to_markdown_table(rows)
                if return_list:
                    return md_table, rows
                return md_table
    except Exception:
        # If table parsing fails, continue with normal processing
        pass

    # Decide whether to format into numbered points
    format_points = should_format_as_points(user_query or "", raw)

    if not format_points:
        final_raw = raw.rstrip()
        if return_list:
            return final_raw, []
        return final_raw

    # --- POST PROCESS (only if we decided to format) ---
    points = _split_into_points(raw)

    # dedupe exact duplicates while preserving order
    seen = set()
    deduped = []
    for p in points:
        pp = p.strip()
        if pp and pp not in seen:
            seen.add(pp)
            deduped.append(pp)

    if not deduped and raw:
        deduped = [raw.strip()]

    formatted = _format_numbered(deduped)

    if return_list:
        return formatted, deduped
    return formatted

# ------------------ PIAI Interaction (send -> scrape) ------------------
def interact_with_piai(query):
    q = query.lower()

    # quick local handlers
    if "current time" in q:
        return time.strftime("%H:%M:%S", time.localtime())
    if "open youtube" in q:
        webbrowser.open("https://www.youtube.com/")
        return "Opening YouTube..."
    if "google search" in q or any(p in q for p in ["search for", "look up", "where is", "what is"]):
        try:
            results = list(search(query, num_results=3))
            if results:
                return "Top results:\n" + "\n".join(results)
        except Exception:
            pass
    if "visit" in q or ".org" in q:
        cleaned = query.replace("open", "").replace("website", "").replace("visit", "").strip().split()[-1]
        if not cleaned.startswith("http"):
            cleaned = "https://" + cleaned
        webbrowser.open(cleaned)
        return "Visiting " + cleaned

    # local intents
    for intent in data['intents']:
        if any(pattern in q for pattern in intent.get('patterns', [])):
            response = random.choice(intent.get('responses', ["Hmm..."]))
            save_conversation(query, response)
            return response

    # check archive for exact match
    try:
        if os.path.exists(CONVERSATIONS_FILE):
            with open(CONVERSATIONS_FILE, "r", encoding="utf-8") as file:
                lines = [ln.strip() for ln in file.readlines()]
                for i in range(0, len(lines), 2):
                    if i + 1 < len(lines):
                        uline = lines[i]
                        aline = lines[i+1]
                        if uline.startswith("User: ") and aline.startswith("AI: "):
                            saved_query = uline.split("User: ", 1)[1]
                            saved_resp = aline.split("AI: ", 1)[1]
                            if saved_query.lower() == query.lower():
                                return saved_resp
    except Exception:
        pass

    if driver is None:
        fallback = "DeepAI/PIAI unavailable (Selenium driver not connected)."
        save_conversation(query, fallback)
        return fallback

    # Send and scrape
    try:
        send_message_to_piai(query)
        # use the scraper with formatting (returns numbered string or md table)
        result = scrape_and_number_from_piai(timeout=30, user_query=query)
    except Exception as e:
        result = f"PIAI interaction error: {e}"

    save_conversation(query, result)
    return result

# ------------------ FIREBASE TOKEN VERIFICATION ------------------
def verify_firebase_token(req):
    auth_header = req.headers.get("Authorization", "")
    if not auth_header:
        return abort(make_response(jsonify({"error": "Missing Authorization header"}), 401))

    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return abort(make_response(jsonify({"error": "Invalid Authorization format. Use: Bearer <idToken>"}), 401))

    id_token = parts[1]
    try:
        decoded = auth.verify_id_token(id_token)
        uid = decoded.get("uid")
        if not uid:
            return abort(make_response(jsonify({"error": "Invalid token (no uid)"}), 401))
        return uid
    except Exception as e:
        return abort(make_response(jsonify({"error": "Token verification failed", "detail": str(e)}), 401))

# ------------------ FLASK APP & ROUTES ------------------
app = Flask(__name__)
CORS(app)
# ------------------ Chat edit / delete endpoints ------------------

@app.route('/api/chat/<int:chat_id>', methods=['PATCH'])
def api_rename_chat(chat_id):
    """
    PATCH /api/chat/<chat_id>
    Body: { "title": "New Title" }
    """
    uid = verify_firebase_token(request)
    data = request.get_json(silent=True) or {}
    new_title = (data.get("title") or "").strip()
    if not new_title:
        return jsonify({"error": "Missing or empty title"}), 400

    chats = load_chats_for_user(uid)
    if not chats:
        return jsonify({"error": "No chats found for user"}), 404

    # Find chat by numeric id
    for i, chat in enumerate(chats):
        # chat.get("id") may be int already; ensure int matching
        try:
            if int(chat.get("id", -1)) == int(chat_id):
                # update
                chats[i]["title"] = new_title
                save_chats_for_user(uid, chats)
                return jsonify({"chat": chats[i]}), 200

        except Exception:
            continue

    return jsonify({"error": "Chat not found"}), 404


@app.route('/api/chat/<int:chat_id>', methods=['DELETE'])
def api_delete_chat(chat_id):
    """
    DELETE /api/chat/<chat_id>
    """
    uid = verify_firebase_token(request)
    chats = load_chats_for_user(uid)
    if not chats:
        return jsonify({"error": "No chats found for user"}), 404

    found = False
    new_list = []
    for chat in chats:
        try:
            if int(chat.get("id", -1)) == int(chat_id):
                found = True
                continue  # skip — delete it
        except Exception:
            new_list.append(chat)
            continue
        new_list.append(chat)

    if not found:
        return jsonify({"error": "Chat not found"}), 404

    # save updated list
    save_chats_for_user(uid, new_list)
    return jsonify({"success": True}), 200


@app.route('/api/chats', methods=['GET'])
def api_get_chats():
    uid = verify_firebase_token(request)
    chats = load_chats_for_user(uid)
    return jsonify(chats)

@app.route('/api/new-chat', methods=['POST'])
def api_new_chat():
    uid = verify_firebase_token(request)
    data = request.get_json(silent=True) or {}
    first_message = data.get("firstMessage", "Hi").strip()
    chat = create_new_chat_for_user(uid, first_message)
    reply = interact_with_piai(first_message)
    add_message_to_chat_for_user(uid, chat["id"], "assistant", reply)
    return jsonify({"chat": chat, "response": reply})

@app.route('/api/ai', methods=['POST'])
def api_ai():
    uid = verify_firebase_token(request)
    data = request.get_json(silent=True) or {}
    message = data.get("message", "").strip()
    chat_id = data.get("chatId")
    if not message or not chat_id:
        return jsonify({"error": "Missing data"}), 400
    try:
        chat_id = int(chat_id)
    except Exception:
        return jsonify({"error": "Invalid chatId"}), 400

    chat = add_message_to_chat_for_user(uid, chat_id, "user", message)
    if not chat:
        return jsonify({"error": "Chat not found"}), 404

    response = interact_with_piai(message)
    add_message_to_chat_for_user(uid, chat_id, "assistant", response)
    return jsonify({"message": response})

@app.route('/api/signup', methods=['POST'])
def api_signup():
    data = request.get_json(silent=True) or {}
    email = data.get('email')
    password = data.get('password')
    name = data.get('name', 'User')
    if not email or not password:
        return jsonify({"error": "email and password required"}), 400
    try:
        user = auth.create_user(email=email, password=password, display_name=name)
        return jsonify({"success": True, "uid": user.uid})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/debug/selenium', methods=['GET'])
def api_debug_selenium():
    ok = driver is not None
    return jsonify({"selenium_connected": ok})

# ------------------ RUN SERVER ------------------
if __name__ == '__main__':
    print("="*60)
    print("JARVIS IS NOW FULLY ALIVE & UNKILLABLE")
    print("Keep this window + Chrome window open")
    print("Your AI works 24/7 (if Selenium driver is connected)")
    print("="*60)
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)

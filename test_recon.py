from playwright.sync_api import sync_playwright
import os

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 800})

    errors = []
    page.on("console", lambda msg: errors.append(f"[{msg.type}] {msg.text}") if msg.type in ["error", "warning"] else None)
    page.on("pageerror", lambda err: errors.append(f"[pageerror] {err}"))

    try:
        page.goto("http://localhost:1420/", wait_until="networkidle", timeout=15000)
    except Exception as e:
        print(f"Navigation error: {e}")

    page.wait_for_timeout(3000)

    screenshot_path = os.path.join(os.path.dirname(__file__), "screenshots")
    os.makedirs(screenshot_path, exist_ok=True)
    page.screenshot(path=os.path.join(screenshot_path, "homepage.png"), full_page=True)

    content = page.content()
    print("=== PAGE TITLE ===")
    print(page.title())

    print("\n=== CONSOLE ERRORS ===")
    for e in errors[:30]:
        print(e)

    print("\n=== BODY TEXT (first 2000 chars) ===")
    body_text = page.inner_text("body")
    print(body_text[:2000])

    print("\n=== BUTTONS ===")
    buttons = page.locator("button").all()
    for i, btn in enumerate(buttons[:20]):
        try:
            print(f"  [{i}] text='{btn.inner_text()[:50]}' visible={btn.is_visible()}")
        except:
            pass

    print("\n=== SIDEBAR ITEMS ===")
    sidebar_items = page.locator("a, [class*='sidebar'], [class*='menu'], [class*='nav']").all()
    for i, item in enumerate(sidebar_items[:30]):
        try:
            txt = item.inner_text()[:40]
            cls = item.get_attribute("class") or ""
            if txt.strip():
                print(f"  [{i}] text='{txt}' class='{cls[:60]}'")
        except:
            pass

    browser.close()
    print("\nDone.")

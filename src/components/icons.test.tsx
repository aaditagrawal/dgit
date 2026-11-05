import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ChevronDown, ClipboardPaste, Download, Moon, Sun, X } from "./icons"

const icons = [ChevronDown, ClipboardPaste, Download, Moon, Sun, X]

describe("icons", () => {
  it.each(icons)(
    "renders %s as a decorative, CSS-sized SVG on the server",
    (Icon) => {
      const markup = renderToStaticMarkup(
        <Icon data-stylex-sized className="dgit-icon" />
      )
      expect(markup).toContain('viewBox="0 0 24 24"')
      expect(markup).toContain('width="24" height="24"')
      expect(markup).toContain('stroke="currentColor"')
      expect(markup).toContain('fill="none"')
      expect(markup).toContain('stroke-width="2"')
      expect(markup).toContain('aria-hidden="true"')
      expect(markup).toContain('focusable="false"')
      expect(markup).toContain('data-stylex-sized="true"')
      expect(markup).toContain('class="dgit-icon"')
    }
  )

  it("forwards SVG attributes and accessible names", () => {
    const markup = renderToStaticMarkup(
      <Download
        aria-label="Download"
        width="16"
        height="16"
        strokeWidth="1.5"
      />
    )
    expect(markup).toContain('aria-label="Download"')
    expect(markup).not.toContain("aria-hidden")
    expect(markup).toContain('width="16" height="16"')
    expect(markup).toContain('stroke-width="1.5"')
    expect(
      renderToStaticMarkup(<Sun aria-labelledby="theme-label" />)
    ).not.toContain("aria-hidden")
    expect(renderToStaticMarkup(<X aria-hidden="false" />)).toContain(
      'aria-hidden="false"'
    )
  })
})

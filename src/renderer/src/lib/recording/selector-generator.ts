/**
 * Generate a reasonable CSS selector for an element
 * This is a simplified version - can be enhanced for better accuracy
 */
export function generateSelector(element: Element): string {
  // Try to use ID first
  if (element.id) {
    return `#${element.id}`;
  }

  // Build a path using tag names and nth-child
  const path: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    // Add classes if available (limit to 2 for brevity)
    if (current.classList.length > 0) {
      const classes = Array.from(current.classList)
        .slice(0, 2)
        .map((c) => `.${c}`)
        .join("");
      selector += classes;
    }

    // Add nth-child if there are siblings with the same tag
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child) => child.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(" > ");
}

/**
 * Get a simplified text content from an element (max 50 chars)
 */
export function getElementText(element: Element): string | undefined {
  const text = element.textContent?.trim();
  if (!text || text.length === 0) return undefined;
  return text.length > 50 ? text.substring(0, 47) + "..." : text;
}

import type { Theme } from "@earendil-works/pi-coding-agent";
import type { MarkdownTheme } from "@earendil-works/pi-tui";

type OptionalStyleName = "bold" | "italic" | "strikethrough" | "underline";

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Theme is a host class with private fields
function themedText(theme: Theme, token: Parameters<Theme["fg"]>[0]): (text: string) => string {
  return (text) => theme.fg(token, text);
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Partial<Theme> is derived from a host class
function optionalStyle(theme: Partial<Theme>, name: OptionalStyleName): (text: string) => string {
  return (text) => theme[name]?.(text) ?? text;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Theme is a host class with private fields
export function toMarkdownTheme(theme: Theme): MarkdownTheme {
  const optionalStyles: Partial<Theme> = theme;
  return {
    heading: themedText(theme, "mdHeading"),
    link: themedText(theme, "mdLink"),
    linkUrl: themedText(theme, "mdLinkUrl"),
    code: themedText(theme, "mdCode"),
    codeBlock: themedText(theme, "mdCodeBlock"),
    codeBlockBorder: themedText(theme, "mdCodeBlockBorder"),
    quote: themedText(theme, "mdQuote"),
    quoteBorder: themedText(theme, "mdQuoteBorder"),
    hr: themedText(theme, "mdHr"),
    listBullet: themedText(theme, "mdListBullet"),
    bold: optionalStyle(optionalStyles, "bold"),
    italic: optionalStyle(optionalStyles, "italic"),
    strikethrough: optionalStyle(optionalStyles, "strikethrough"),
    underline: optionalStyle(optionalStyles, "underline"),
  };
}

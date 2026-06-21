/** The slice of xml-js's non-compact JSON shape we read and emit. */
export interface XmlNode {
  type?: string;
  name?: string;
  text?: string | number;
  cdata?: string;
  doctype?: string;
  attributes?: Record<string, string>;
  elements?: XmlNode[];
  declaration?: { attributes?: Record<string, string> };
}

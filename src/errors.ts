// spec(mdom.errors): all errors extend MdomError, narrowed by error.kind

export type MdomErrorKind = 'xml-parse' | 'invalid-musicxml' | 'unsupported-feature' | 'todo';

export abstract class MdomError extends Error {
  abstract readonly kind: MdomErrorKind;

  override get name() {
    return this.constructor.name;
  }
}

// spec(mdom.errors): XmlParseError — input is not well-formed XML
export class XmlParseError extends MdomError {
  readonly kind = 'xml-parse';
}

// spec(mdom.errors): InvalidMusicXmlError — well-formed XML but not valid MusicXML
export class InvalidMusicXmlError extends MdomError {
  readonly kind = 'invalid-musicxml';
}

// spec(mdom.errors): UnsupportedFeatureError — valid MusicXML mdom does not yet model
export class UnsupportedFeatureError extends MdomError {
  readonly kind = 'unsupported-feature';
}

// spec(mdom.errors): TodoError — unimplemented code path, interim only
export class TodoError extends MdomError {
  readonly kind = 'todo';

  constructor() {
    super('TODO');
  }
}

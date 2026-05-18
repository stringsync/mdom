class MdomError extends Error {}

class TodoError extends MdomError {
  constructor() {
    super('TODO');
  }
}

export class errors {
  private constructor() {}

  static todo() {
    return new TodoError();
  }
}

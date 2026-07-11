export class BadRequest extends Error { constructor(msg = 'Bad request') { super(msg); this.name = 'BadRequest'; } }
export class Unauthorized extends Error { constructor(msg = 'Unauthorized') { super(msg); this.name = 'Unauthorized'; } }
export class Forbidden extends Error { constructor(msg = 'Forbidden') { super(msg); this.name = 'Forbidden'; } }
export class NotFound extends Error { constructor(msg = 'Not found') { super(msg); this.name = 'NotFound'; } }
export class Conflict extends Error { constructor(msg = 'Conflict') { super(msg); this.name = 'Conflict'; } }
export class TooManyRequests extends Error { constructor(msg = 'Too many requests') { super(msg); this.name = 'TooManyRequests'; } }

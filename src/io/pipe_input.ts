import { InputAll } from './input_all';
import { Pipe } from './pipe';

export class PipeInput extends InputAll {
  constructor(readonly pipe: Pipe) {
    super();
  }

  readAll(): string {
    const ret = this.pipe.allContent;
    this.pipe.clear();
    return ret;
  }
}

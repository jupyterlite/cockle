import { InputAll } from './input_all';

/**
 * Input that reads from a string. Used for here strings such as 'cat <<< hello'.
 */
export class StringInput extends InputAll {
  constructor(readonly content: string) {
    super();
  }

  readAll(): string {
    return this.content;
  }
}

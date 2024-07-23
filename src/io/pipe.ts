import { BufferedOutput } from './buffered_output';
import { PipeInput } from './pipe_input';

/**
 * A Pipe provides IOutput and IInput, accepting output and passing it to the input.
 * To obtain the input interface PipeInput, call the .input attribute.
 */
export class Pipe extends BufferedOutput {
  override async flush(): Promise<void> {}

  get input(): PipeInput {
    // Should restrict this to just one?
    return new PipeInput(this);
  }
}

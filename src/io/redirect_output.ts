import { BufferedOutput } from './buffered_output';
import { IOutput } from './output';

export class RedirectOutput extends BufferedOutput {
  constructor(target: IOutput) {
    super();
    this.target = target;
  }

  override flush(): void {
    this.data.forEach(line => this.target.write(line));
    this.clear();
    this.target.flush();
  }

  private readonly target: IOutput;
}

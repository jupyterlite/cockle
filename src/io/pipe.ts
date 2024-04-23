import { Output } from "./output"

export class Pipe extends Output {
  constructor() {
    super()
  }

  override async flush(): Promise<void> {
  }

  override async write(text: string): Promise<void> {
    
  }
}

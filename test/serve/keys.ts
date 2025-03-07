const ESCAPE = '\x1b';

export const keys = {
  enter: '\r',
  tab: '\t',
  EOT: '\x04',
  backspace: '\x7F',
  escape: ESCAPE,
  upArrow: ESCAPE + '[A',
  downArrow: ESCAPE + '[B',
  rightArrow: ESCAPE + '[C',
  leftArrow: ESCAPE + '[D',
  delete_: ESCAPE + '[3~',
  home: ESCAPE + '[H',
  end: ESCAPE + '[F',
  prev: ESCAPE + '[1;2D',
  next: ESCAPE + '[1;2C',
  up: ESCAPE + 'OA',
  down: ESCAPE + 'OB',
  right: ESCAPE + 'OC',
  left: ESCAPE + 'OD'
};

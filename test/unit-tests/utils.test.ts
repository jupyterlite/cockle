import { joinURL } from '../../src/utils';

describe('joinURL', () => {
  test('should should use just one slash between baseUrl and path', () => {
    const expected = 'http://localhost/path';
    expect(joinURL('http://localhost', 'path')).toEqual(expected);
    expect(joinURL('http://localhost/', 'path')).toEqual(expected);
    expect(joinURL('http://localhost//', 'path')).toEqual(expected);
    expect(joinURL('http://localhost', '/path')).toEqual(expected);
    expect(joinURL('http://localhost', '//path')).toEqual(expected);
    expect(joinURL('http://localhost/', '/path')).toEqual(expected);
    expect(joinURL('http://localhost//', '/path')).toEqual(expected);
    expect(joinURL('http://localhost/', '//path')).toEqual(expected);
    expect(joinURL('http://localhost//', '//path')).toEqual(expected);
  });
});

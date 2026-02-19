import * as path from 'path';
import { execute } from '../src/index';
import { OrchidValue, valueToString } from '../src/runtime/values';
import { OrchidError } from '../src/runtime/interpreter';

// Suppress console output during tests
const originalLog = console.log;
const originalWarn = console.warn;
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
});
afterAll(() => {
  console.log = originalLog;
  console.warn = originalWarn;
});

// The fixtures directory contains test plugins
const fixturesDir = path.resolve(__dirname, 'fixtures');

async function run(source: string): Promise<OrchidValue> {
  return execute(source, undefined, { scriptDir: fixturesDir });
}

describe('Plugin system', () => {
  describe('loading', () => {
    it('should load a plugin from plugins/ directory', async () => {
      const result = await run(`
Use Plugin("greeter") as g
x := g:Greet("World")
`);
      expect(result.kind).toBe('string');
      expect(valueToString(result)).toBe('Hello, World!');
    });

    it('should load a plugin with default alias (hyphen to underscore)', async () => {
      const result = await run(`
Use Plugin("multi-file")
x := multi_file:Add(2, 3)
`);
      expect(result.kind).toBe('number');
      if (result.kind === 'number') expect(result.value).toBe(5);
    });

    it('should load a directory plugin via index.orch', async () => {
      const result = await run(`
Use Plugin("multi-file") as mf
x := mf:Add(10, 20)
`);
      expect(result.kind).toBe('number');
      if (result.kind === 'number') expect(result.value).toBe(30);
    });

    it('should throw ToolNotFound for missing plugins', async () => {
      await expect(run(`
Use Plugin("nonexistent")
`)).rejects.toThrow('ToolNotFound');
    });

    it('should strip version constraints from plugin name', async () => {
      // "greeter@~1.0" should resolve to "greeter"
      const result = await run(`
Use Plugin("greeter@~1.0") as g
x := g:Greet("Versioned")
`);
      expect(valueToString(result)).toBe('Hello, Versioned!');
    });
  });

  describe('dispatching operations', () => {
    it('should dispatch to plugin agents', async () => {
      const result = await run(`
Use Plugin("greeter") as g
g:Greet("Agent")
`);
      expect(valueToString(result)).toBe('Hello, Agent!');
    });

    it('should dispatch to plugin macros', async () => {
      const result = await run(`
Use Plugin("greeter") as g
g:Shout("wow")
`);
      expect(valueToString(result)).toBe('wow!!!');
    });

    it('should throw ToolNotFound for unknown operations', async () => {
      await expect(run(`
Use Plugin("greeter") as g
g:NonExistent("test")
`)).rejects.toThrow('ToolNotFound');
    });
  });

  describe('ORCHID_PLUGIN_PATH', () => {
    const originalEnv = process.env.ORCHID_PLUGIN_PATH;

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.ORCHID_PLUGIN_PATH;
      } else {
        process.env.ORCHID_PLUGIN_PATH = originalEnv;
      }
    });

    it('should find plugins via ORCHID_PLUGIN_PATH', async () => {
      const pluginsDir = path.resolve(fixturesDir, 'plugins');
      process.env.ORCHID_PLUGIN_PATH = pluginsDir;

      // Run from a directory that does NOT have a plugins/ subdirectory
      const result = await execute(`
Use Plugin("greeter") as g
g:Greet("EnvPath")
`, undefined, { scriptDir: '/tmp' });

      expect(valueToString(result)).toBe('Hello, EnvPath!');
    });
  });

  describe('isolation', () => {
    it('should not leak plugin variables into caller scope', async () => {
      // The greeter plugin defines `farewell` as a top-level fn.
      // It should NOT be accessible as a bare name in the caller.
      const result = await run(`
Use Plugin("greeter") as g
x := g:Greet("Test")
# farewell should be null in the caller's scope
farewell
`);
      expect(result.kind).toBe('null');
    });
  });
});

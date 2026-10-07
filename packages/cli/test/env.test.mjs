// Run with `pnpm build && pnpm test` in packages/cli.
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseEnv } from "../dist/lib.js";

test("parseEnv", () => {
	const src = [
		"# comment",
		"  # indented comment",
		"export A=1",
		"B = spaced value  ",
		"C=has#hash",
		"D=value # comment",
		'E="quoted # not a comment" # comment',
		"F='single $NOT_EXPANDED'",
		'G="line\\nbreak \\"q\\""',
		'H="multi',
		'line"',
		"I=",
		"J= #only comment",
		"K=`tick`",
		"L=crlf\r",
		"not a line",
	].join("\n");
	assert.deepEqual(parseEnv(src), {
		A: "1",
		B: "spaced value",
		C: "has#hash",
		D: "value",
		E: "quoted # not a comment",
		F: "single $NOT_EXPANDED",
		G: 'line\nbreak "q"',
		H: "multi\nline",
		I: "",
		J: "",
		K: "tick",
		L: "crlf",
	});
});

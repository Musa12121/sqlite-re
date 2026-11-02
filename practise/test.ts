import assert from "node:assert/strict";
import { MySqliteRequest } from "./MySqliteRequest.ts";

const agesAscending = await new MySqliteRequest()
  .from("students.csv")
  .order_by("age", "ASC")
  .run();

assert.deepEqual(
  agesAscending.map((row) => row.age),
  ["-10", "-2", "0", "2.5"],
);

const agesDescending = await new MySqliteRequest()
  .from("students.csv")
  .order_by("age", "DESC")
  .run();

assert.deepEqual(
  agesDescending.map((row) => row.age),
  ["2.5", "0", "-2", "-10"],
);

const gradesAscending = await new MySqliteRequest()
  .from("students.csv")
  .order_by("grade", "ASC")
  .run();

assert.deepEqual(
  gradesAscending.map((row) => row.grade),
  ["A", "A", "B", "C"],
);

const gradesDescending = await new MySqliteRequest()
  .from("students.csv")
  .order_by("grade", "DESC")
  .run();

assert.deepEqual(
  gradesDescending.map((row) => row.grade),
  ["C", "B", "A", "A"],
);

console.log("ORDER BY tests passed");
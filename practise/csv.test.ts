// Add escapeCsvValue to your existing import.


import { escapeCsvValue, stringifyCsv } from "./csvParse.ts";
import assert from 'node:assert/strict'


const csv = stringifyCsv(
    ["name", "bio"],
    [
        { name: "Alice", bio: "Music, books" },
        { name: "Bob", bio: "Coding" }
    ]
);

console.log(csv);